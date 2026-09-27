import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import {
  ANNOUNCEMENT_BODY_MAX,
  ANNOUNCEMENT_TITLE_MAX,
} from "@playrates/shared";
import {
  USER_A,
  USER_B,
  authHeader,
  buildTestApp,
} from "../helpers/buildTestApp.js";
import {
  baseSeed,
  buildGame,
  buildMessage,
  buildProfile,
  buildThread,
} from "../helpers/fixtures.js";
import type {
  ExternalGame,
  GamePage,
  GamesProvider,
} from "../../src/providers/games/GamesProvider.js";

const ADMIN = "33333333-3333-3333-3333-333333333333";

const releaseNotes = (title: string) => ({
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: title }] },
    { type: "paragraph", content: [{ type: "text", text: "Fixed things." }] },
  ],
});

const seed = () => {
  const base = baseSeed();
  return {
    ...base,
    profiles: [
      ...base.profiles,
      buildProfile({ id: ADMIN, username: "calbgyn", is_admin: true }),
    ],
    communityThreads: [
      buildThread(),
      buildThread({
        id: 7,
        subject_kind: "patch_notes",
        game_id: null,
        title: "PlayRates patch notes",
        author_id: ADMIN,
      }),
    ],
    communityMessages: [
      buildMessage({ id: 1, is_opening: true }),
      buildMessage({
        id: 40,
        thread_id: 7,
        author_id: ADMIN,
        is_opening: true,
        body: releaseNotes("v1.0 Launch"),
        created_at: "2026-09-20T10:00:00Z",
      }),
      buildMessage({
        id: 41,
        thread_id: 7,
        author_id: ADMIN,
        body: releaseNotes("v1.1 Lists"),
        created_at: "2026-09-26T10:00:00Z",
      }),
      buildMessage({
        id: 42,
        thread_id: 7,
        author_id: ADMIN,
        body: releaseNotes("Pulled"),
        created_at: "2026-09-27T10:00:00Z",
        deleted_at: "2026-09-27T10:05:00Z",
      }),
    ],
  };
};

const external = (id: number, title = `Game ${id}`): ExternalGame => ({
  externalId: id,
  slug: `game-${id}`,
  title,
  description: "",
  coverUrl: null,
  boxArtUrl: null,
  releaseDate: "2026-09-20",
  platformSlugs: [],
  systemSlugs: [],
  genres: [],
  developers: [],
  publishers: [],
  website: null,
  esrbRating: null,
  hasSexualContent: false,
  contentTags: [],
  metacritic: null,
  rawgRating: null,
  rawgRatingCount: null,
  rawgAddedCount: null,
  playtimeHours: null,
});

const stubProvider = (overrides: Partial<GamesProvider> = {}): GamesProvider => ({
  name: "stub",
  isConfigured: true,
  search: vi.fn(async () => []),
  getById: vi.fn(async () => null),
  listByPopularity: vi.fn(async () => ({ games: [], total: 0, hasNext: false })),
  listByDate: vi.fn(async () => ({ games: [], total: 0, hasNext: false })),
  ...overrides,
});

const announcement = {
  tone: "update",
  title: "Lists are here",
  body: "Make a list of anything and share it with friends.",
  link: "/community",
};

/** Every admin endpoint, so the gate is proven for all of them rather than
 *  for the ones someone remembered to test. */
const ENDPOINTS: { method: "get" | "post" | "patch" | "put"; path: string; body?: object }[] = [
  { method: "get", path: "/api/v1/admin/stats/overview" },
  { method: "get", path: "/api/v1/admin/stats/users" },
  { method: "get", path: "/api/v1/admin/activity" },
  { method: "get", path: "/api/v1/admin/users" },
  { method: "get", path: `/api/v1/admin/users/${USER_A}` },
  { method: "get", path: "/api/v1/admin/games/events" },
  { method: "get", path: "/api/v1/admin/games/rawg-usage" },
  { method: "put", path: "/api/v1/admin/games/rawg-usage", body: { left: 6555 } },
  { method: "get", path: "/api/v1/admin/games/search?q=witcher" },
  {
    method: "post",
    path: "/api/v1/admin/games/pull",
    body: { windowDays: 7, includeUpcoming: false, maxPages: 1 },
  },
  { method: "post", path: "/api/v1/admin/games/import", body: { rawgId: 3328 } },
  { method: "post", path: "/api/v1/admin/games/1/resync" },
  { method: "patch", path: "/api/v1/admin/games/1", body: { isTrending: false } },
  { method: "get", path: "/api/v1/admin/announcements" },
  { method: "post", path: "/api/v1/admin/announcements", body: announcement },
  { method: "post", path: "/api/v1/admin/announcements/test", body: announcement },
  { method: "post", path: "/api/v1/admin/announcements/1/retract" },
  { method: "get", path: "/api/v1/admin/patch-notes" },
  { method: "post", path: "/api/v1/admin/patch-notes/41/announce" },
  { method: "post", path: "/api/v1/admin/patch-notes/41/test" },
  { method: "get", path: "/api/v1/admin/health" },
  { method: "get", path: "/api/v1/admin/errors" },
];

const call = (
  app: Parameters<typeof request>[0],
  { method, path, body }: (typeof ENDPOINTS)[number],
  userId?: string,
) => {
  let req = request(app)[method](path);
  if (userId) req = req.set("Authorization", authHeader(userId));
  return body ? req.send(body) : req;
};

describe("admin gate", () => {
  it.each(ENDPOINTS)("$method $path refuses anyone signed out", async (endpoint) => {
    const { app } = buildTestApp({ seed: seed() });
    expect((await call(app, endpoint)).status).toBe(401);
  });

  it.each(ENDPOINTS)(
    "$method $path looks absent to a signed-in user who is not the admin",
    async (endpoint) => {
      const { app, state } = buildTestApp({ seed: seed() });
      const before = JSON.stringify(state.notifications);

      const response = await call(app, endpoint, USER_A);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("not_found");
      // and nothing happened on the way to the refusal
      expect(JSON.stringify(state.notifications)).toBe(before);
    },
  );

  it("lets the admin in", async () => {
    const { app } = buildTestApp({ seed: seed() });
    const response = await request(app)
      .get("/api/v1/admin/stats/overview?range=7d")
      .set("Authorization", authHeader(ADMIN));

    expect(response.status).toBe(200);
    expect(response.body.totals.users).toBe(3);
    expect(response.body.bucket).toBe("day");
  });

  it("takes the flag away at once when it is revoked", async () => {
    const { app, state } = buildTestApp({ seed: seed() });
    state.profiles.find((p) => p.id === ADMIN)!.is_admin = false;

    const response = await request(app)
      .get("/api/v1/admin/health")
      .set("Authorization", authHeader(ADMIN));

    expect(response.status).toBe(404);
  });
});

describe("public health", () => {
  it("answers under /api, where the host routes requests", async () => {
    const { app } = buildTestApp();
    const response = await request(app).get("/api/v1/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });
});

describe("admin announcements", () => {
  const send = (app: Parameters<typeof request>[0], body: object, path = "") =>
    request(app)
      .post(`/api/v1/admin/announcements${path}`)
      .set("Authorization", authHeader(ADMIN))
      .send(body);

  it("delivers one copy to every account", async () => {
    const { app, state } = buildTestApp({ seed: seed() });

    const response = await send(app, announcement);

    expect(response.status).toBe(201);
    expect(response.body.recipientCount).toBe(3);
    const copies = state.notifications.filter((n) => n.kind === "announcement");
    expect(copies.map((n) => n.user_id).sort()).toEqual(
      [USER_A, USER_B, ADMIN].sort(),
    );
  });

  it("shows in a user's bell with its tone, words and link", async () => {
    const { app } = buildTestApp({ seed: seed() });
    await send(app, announcement);

    const feed = await request(app)
      .get("/api/v1/me/notifications")
      .set("Authorization", authHeader(USER_A));

    expect(feed.body.data[0]).toMatchObject({
      kind: "announcement",
      tone: "update",
      title: announcement.title,
      body: announcement.body,
      link: "/community",
      isTest: false,
    });
  });

  it.each([
    ["a title over the limit", { title: "x".repeat(ANNOUNCEMENT_TITLE_MAX + 1) }],
    ["a body over the limit", { body: "x".repeat(ANNOUNCEMENT_BODY_MAX + 1) }],
    ["an empty title", { title: "   " }],
    ["an unknown tone", { tone: "shouting" }],
    ["a link to another site", { link: "https://example.com" }],
    ["a protocol-relative link", { link: "//example.com/phish" }],
  ])("refuses %s", async (_label, override) => {
    const { app, state } = buildTestApp({ seed: seed() });

    const response = await send(app, { ...announcement, ...override });

    expect(response.status).toBe(422);
    expect(state.notifications.some((n) => n.kind === "announcement")).toBe(false);
  });

  it("sends a test only to the admin, and keeps it out of the history", async () => {
    const { app, state } = buildTestApp({ seed: seed() });

    const response = await send(app, announcement, "/test");

    expect(response.status).toBe(204);
    const copies = state.notifications.filter((n) => n.kind === "announcement");
    expect(copies).toHaveLength(1);
    expect(copies[0]!.user_id).toBe(ADMIN);

    const history = await request(app)
      .get("/api/v1/admin/announcements")
      .set("Authorization", authHeader(ADMIN));
    expect(history.body).toEqual([]);

    const feed = await request(app)
      .get("/api/v1/me/notifications")
      .set("Authorization", authHeader(ADMIN));
    expect(feed.body.data[0]).toMatchObject({ kind: "announcement", isTest: true });
  });

  it("counts reads, and retracting takes every copy back", async () => {
    const { app, state } = buildTestApp({ seed: seed() });
    const { body: sent } = await send(app, announcement);
    state.notifications.find((n) => n.user_id === USER_A)!.read_at =
      new Date().toISOString();

    const history = await request(app)
      .get("/api/v1/admin/announcements")
      .set("Authorization", authHeader(ADMIN));
    expect(history.body[0]).toMatchObject({ recipientCount: 3, readCount: 1 });

    const retracted = await request(app)
      .post(`/api/v1/admin/announcements/${sent.id}/retract`)
      .set("Authorization", authHeader(ADMIN));

    expect(retracted.status).toBe(200);
    expect(retracted.body.retractedAt).not.toBeNull();
    expect(state.notifications.some((n) => n.kind === "announcement")).toBe(false);
  });

  it("404s retracting one that does not exist", async () => {
    const { app } = buildTestApp({ seed: seed() });
    const response = await request(app)
      .post("/api/v1/admin/announcements/424242/retract")
      .set("Authorization", authHeader(ADMIN));
    expect(response.status).toBe(404);
  });
});

describe("admin catalogue controls", () => {
  const admin = (req: request.Test) => req.set("Authorization", authHeader(ADMIN));

  it("pulls page by page up to the cap, counting new and known games", async () => {
    const pages: GamePage[] = [
      // 3328 is the seeded Witcher, so it is an update, not an addition
      { games: [external(3328, "The Witcher 3"), external(10)], total: 90, hasNext: true },
      { games: [external(11), external(12)], total: 90, hasNext: true },
      { games: [external(13)], total: 90, hasNext: true },
    ];
    const listByDate = vi.fn(async ({ page }: { page: number }) => pages[page - 1]!);
    const { app, state } = buildTestApp({
      seed: seed(),
      provider: stubProvider({ listByDate }),
    });

    const response = await admin(
      request(app).post("/api/v1/admin/games/pull"),
    ).send({ windowDays: 30, includeUpcoming: true, maxPages: 2 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      pages: 2,
      fetched: 4,
      added: 3,
      updated: 1,
      hasMore: true,
    });
    expect(listByDate).toHaveBeenCalledTimes(2);
    expect(state.games.map((g) => g.rawg_id)).toEqual(
      expect.arrayContaining([10, 11, 12]),
    );
    expect(state.gameEvents.at(-1)).toMatchObject({
      kind: "manual_pull",
      source: "manual_pull",
      actor_id: ADMIN,
    });
  });

  it("stops at the last page even under the cap", async () => {
    const listByDate = vi.fn(async () => ({
      games: [external(20)],
      total: 1,
      hasNext: false,
    }));
    const { app } = buildTestApp({ seed: seed(), provider: stubProvider({ listByDate }) });

    const response = await admin(request(app).post("/api/v1/admin/games/pull")).send({
      windowDays: 7,
      includeUpcoming: false,
      maxPages: 5,
    });

    expect(response.body).toMatchObject({ pages: 1, added: 1, hasMore: false });
    expect(listByDate).toHaveBeenCalledOnce();
  });

  it("refuses more than five pages, since each one spends the allowance", async () => {
    const { app } = buildTestApp({ seed: seed(), provider: stubProvider() });
    const response = await admin(request(app).post("/api/v1/admin/games/pull")).send({
      windowDays: 7,
      includeUpcoming: false,
      maxPages: 6,
    });
    expect(response.status).toBe(422);
  });

  it("503s a pull with no provider configured", async () => {
    const { app } = buildTestApp({ seed: seed() });
    const response = await admin(request(app).post("/api/v1/admin/games/pull")).send({
      windowDays: 7,
      includeUpcoming: false,
      maxPages: 1,
    });
    expect(response.status).toBe(503);
  });

  it("sets and clears trending, logging who did it", async () => {
    const { app, state } = buildTestApp({ seed: seed() });

    const response = await admin(request(app).patch("/api/v1/admin/games/1")).send({
      isTrending: false,
    });

    expect(response.status).toBe(200);
    expect(response.body.isTrending).toBe(false);
    expect(state.games[0]!.is_trending).toBe(false);
    expect(state.gameEvents).toEqual([
      expect.objectContaining({ kind: "trending_cleared", actor_id: ADMIN, game_id: 1 }),
    ]);
  });

  it("re-syncs a game's details now", async () => {
    const getById = vi.fn(async () => ({
      ...external(3328, "The Witcher 3: Wild Hunt"),
      description: "Fresh from RAWG.",
    }));
    const { app, state } = buildTestApp({ seed: seed(), provider: stubProvider({ getById }) });

    const response = await admin(request(app).post("/api/v1/admin/games/1/resync"));

    expect(response.status).toBe(200);
    expect(getById).toHaveBeenCalledWith(3328);
    expect(state.games[0]!.description).toBe("Fresh from RAWG.");
    expect(state.gameEvents.at(-1)).toMatchObject({
      kind: "details_resynced",
      data: expect.objectContaining({ ok: true }),
    });
  });

  it("reports a failed re-sync, and logs why", async () => {
    const getById = vi.fn(async () => {
      throw new Error("RAWG responded 503");
    });
    const { app, state } = buildTestApp({ seed: seed(), provider: stubProvider({ getById }) });

    const response = await admin(request(app).post("/api/v1/admin/games/1/resync"));

    expect(response.status).toBe(502);
    expect(state.gameEvents.map((e) => e.kind)).toEqual([
      "details_backfill_failed",
      "details_resynced",
    ]);
    expect(state.gameEvents[0]!.data.error).toBe("RAWG responded 503");
  });

  it("refuses to re-sync a game that did not come from RAWG", async () => {
    const base = seed();
    const { app } = buildTestApp({
      seed: { ...base, games: [buildGame({ rawg_id: null })] },
      provider: stubProvider(),
    });
    const response = await admin(request(app).post("/api/v1/admin/games/1/resync"));
    expect(response.status).toBe(422);
  });

  it("logs a search that fell through to RAWG, with what it brought in", async () => {
    const provider = stubProvider({
      search: vi.fn(async () => [external(50, "Hades II"), external(3328)]),
    });
    const { app, state } = buildTestApp({ seed: seed(), provider });

    await request(app)
      .get("/api/v1/games/search?q=hades")
      .set("Authorization", authHeader(USER_A));

    expect(state.gameEvents).toEqual([
      expect.objectContaining({
        kind: "search_pull",
        source: "search",
        actor_id: USER_A,
        data: expect.objectContaining({ term: "hades", fetched: 2, added: 1 }),
      }),
    ]);
  });
});

describe("admin feeds", () => {
  it("pages the activity log newest first by cursor", async () => {
    const events = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      actor_id: USER_A,
      kind: "log_added",
      game_id: 1,
      subject_id: String(i + 1),
      data: { status: "playing" },
      created_at: new Date(2026, 8, i + 1).toISOString(),
    }));
    const { app } = buildTestApp({ seed: { ...seed(), activityEvents: events } });
    const get = (query: string) =>
      request(app)
        .get(`/api/v1/admin/activity?${query}`)
        .set("Authorization", authHeader(ADMIN));

    const first = await get("limit=2");
    expect(first.body.data.map((e: { id: number }) => e.id)).toEqual([5, 4]);
    expect(first.body.nextBefore).toBe(4);
    expect(first.body.data[0]).toMatchObject({
      group: "logs",
      actor: { id: USER_A },
      game: { id: 1 },
    });

    const last = await get("limit=2&before=2");
    expect(last.body.data.map((e: { id: number }) => e.id)).toEqual([1]);
    expect(last.body.nextBefore).toBeNull();
  });

  it("filters the activity log by group", async () => {
    const { app } = buildTestApp({
      seed: {
        ...seed(),
        activityEvents: [
          { id: 1, actor_id: USER_A, kind: "signup", game_id: null, subject_id: null, data: {}, created_at: "2026-09-01T00:00:00Z" },
          { id: 2, actor_id: USER_A, kind: "review_posted", game_id: 1, subject_id: "9", data: {}, created_at: "2026-09-02T00:00:00Z" },
        ],
      },
    });
    const response = await request(app)
      .get("/api/v1/admin/activity?group=account")
      .set("Authorization", authHeader(ADMIN));
    expect(response.body.data.map((e: { kind: string }) => e.kind)).toEqual(["signup"]);
  });

  it("finds users by name, with their counts", async () => {
    const { app } = buildTestApp({ seed: seed() });
    const response = await request(app)
      .get("/api/v1/admin/users?q=friend")
      .set("Authorization", authHeader(ADMIN));
    expect(response.body.meta.total).toBe(1);
    expect(response.body.data[0]).toMatchObject({
      username: "frienduser",
      logCount: 0,
    });
  });

  it("reports health, with the database reachable", async () => {
    const { app } = buildTestApp({ seed: seed() });
    const response = await request(app)
      .get("/api/v1/admin/health")
      .set("Authorization", authHeader(ADMIN));
    expect(response.status).toBe(200);
    expect(response.body.database.ok).toBe(true);
    expect(response.body.rawg.configured).toBe(false);
  });
});

describe("admin RAWG allowance", () => {
  const today = new Date().toISOString().slice(0, 10);

  it("counts on from the figure RAWG gives, not from what PlayRates counted", async () => {
    const { app } = buildTestApp({
      seed: {
        ...seed(),
        rawgUsage: [{ day: today, requests: 12, failures: 0, last_request_at: null, last_failure_at: null, last_error: null }],
      },
    });

    const before = await request(app)
      .get("/api/v1/admin/games/rawg-usage")
      .set("Authorization", authHeader(ADMIN));
    expect(before.body).toMatchObject({ basis: "counted", left: 19_988 });

    const corrected = await request(app)
      .put("/api/v1/admin/games/rawg-usage")
      .set("Authorization", authHeader(ADMIN))
      .send({ left: 6555 });

    // The 12 already counted today are inside RAWG's figure.
    expect(corrected.status).toBe(200);
    expect(corrected.body).toMatchObject({ basis: "corrected", left: 6555, since: today });
  });

  it("refuses a figure that isn't a whole number of requests", async () => {
    const { app } = buildTestApp({ seed: seed() });
    const response = await request(app)
      .put("/api/v1/admin/games/rawg-usage")
      .set("Authorization", authHeader(ADMIN))
      .send({ left: -3 });
    expect(response.status).toBe(422);
  });
});

describe("admin patch notes", () => {
  const as = (app: Parameters<typeof request>[0]) => ({
    list: () => request(app).get("/api/v1/admin/patch-notes").set("Authorization", authHeader(ADMIN)),
    post: (path: string) =>
      request(app).post(`/api/v1/admin/patch-notes/${path}`).set("Authorization", authHeader(ADMIN)),
  });

  it("lists standing entries newest first, each named by its h1 and unsent", async () => {
    const { app } = buildTestApp({ seed: seed() });

    const response = await as(app).list();

    expect(response.status).toBe(200);
    expect(response.body.map((n: { title: string }) => n.title)).toEqual(["v1.1 Lists", "v1.0 Launch"]);
    expect(response.body[0]).toMatchObject({
      messageId: 41,
      link: "/community/thread/7#message-41",
      announcement: null,
    });
  });

  it("tells everyone once, with the release in the title and a link to the entry", async () => {
    const { app, state } = buildTestApp({ seed: seed() });

    const sent = await as(app).post("41/announce");

    expect(sent.status).toBe(201);
    expect(sent.body.announcement).toMatchObject({ recipientCount: 3, tone: "update" });
    const copies = state.notifications.filter((n) => n.kind === "announcement");
    expect(copies).toHaveLength(3);
    expect(copies[0]!.data).toMatchObject({
      title: "New patch notes: v1.1 Lists",
      link: "/community/thread/7#message-41",
    });

    const again = await as(app).post("41/announce");
    expect(again.status).toBe(409);
    expect(state.notifications.filter((n) => n.kind === "announcement")).toHaveLength(3);

    const list = await as(app).list();
    expect(list.body[0].announcement).toMatchObject({ id: sent.body.announcement.id });
    expect(list.body[1].announcement).toBeNull();
  });

  it("is free to go out again once the announcement is taken back", async () => {
    const { app } = buildTestApp({ seed: seed() });
    const { body } = await as(app).post("41/announce");

    await request(app)
      .post(`/api/v1/admin/announcements/${body.announcement.id}/retract`)
      .set("Authorization", authHeader(ADMIN));

    expect((await as(app).list()).body[0].announcement).toBeNull();
    expect((await as(app).post("41/announce")).status).toBe(201);
  });

  it("sends a test to the admin alone, and leaves the entry unsent", async () => {
    const { app, state } = buildTestApp({ seed: seed() });

    const response = await as(app).post("41/test");

    expect(response.status).toBe(204);
    const copies = state.notifications.filter((n) => n.kind === "announcement");
    expect(copies.map((n) => n.user_id)).toEqual([ADMIN]);
    expect(copies[0]!.data).toMatchObject({ test: true, title: "New patch notes: v1.1 Lists" });
    expect((await as(app).list()).body[0].announcement).toBeNull();
  });

  it.each([
    ["a deleted entry", "42"],
    ["a message outside the patch notes", "1"],
    ["one that does not exist", "999"],
  ])("will not announce %s", async (_what, id) => {
    const { app, state } = buildTestApp({ seed: seed() });

    expect((await as(app).post(`${id}/announce`)).status).toBe(404);
    expect((await as(app).post(`${id}/test`)).status).toBe(404);
    expect(state.notifications.some((n) => n.kind === "announcement")).toBe(false);
  });
});
