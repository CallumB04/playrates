import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";
import sharp from "sharp";
import {
  authHeader,
  buildTestApp,
  USER_A,
  USER_B,
} from "../helpers/buildTestApp.js";
import {
  baseSeed,
  buildFriendship,
  buildGame,
  buildProfile,
} from "../helpers/fixtures.js";

const STRANGER = "33333333-3333-3333-3333-333333333333";

const games = [1, 2, 3, 4, 5, 6].map((id) =>
  buildGame({
    id,
    slug: `game-${id}`,
    title: `Game ${id}`,
    box_art_url: `https://images.igdb.com/igdb/image/upload/t_cover_big_2x/co${id}.jpg`,
  }),
);

const seed = (overrides: object = {}) => ({
  ...baseSeed(),
  profiles: [
    buildProfile(),
    buildProfile({ id: USER_B, username: "frienduser" }),
    buildProfile({ id: STRANGER, username: "stranger" }),
  ],
  games: [
    ...games,
    buildGame({ id: 9, slug: "adult", has_sexual_content: true }),
  ],
  ...overrides,
});

const as = (user: string) => ({ Authorization: authHeader(user) });

const setup = (overrides: object = {}) => {
  const built = buildTestApp({ seed: seed(overrides) });
  const app: Express = built.app;
  const pick = (category: string, gameId: number, user = USER_A) =>
    request(app)
      .put(`/api/v1/me/gaming-25/picks/${category}`)
      .set(as(user))
      .send({ gameId });
  const clear = (category: string, user = USER_A) =>
    request(app).delete(`/api/v1/me/gaming-25/picks/${category}`).set(as(user));
  const get = (username: string, user?: string) => {
    const req = request(app).get(`/api/v1/users/${username}/gaming-25`);
    return user ? req.set(as(user)) : req;
  };
  const love = (username: string, user: string) =>
    request(app).post(`/api/v1/users/${username}/gaming-25/love`).set(as(user));
  return { ...built, app, pick, clear, get, love };
};

const picked = (grid: {
  picks: { category: string; game: { id: number } }[];
}) => grid.picks.map((p) => [p.category, p.game.id]);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("picking", () => {
  it("is empty until the first pick, then keeps the grid's order", async () => {
    const { pick, get } = setup();
    expect((await get("devuser")).body).toMatchObject({
      picks: [],
      loveCount: 0,
      updatedAt: null,
      owner: { username: "devuser" },
    });

    await pick("best_ending", 3);
    await pick("childhood_classic", 1);
    const grid = (await pick("all_time_favourite", 1)).body;

    // The same game may fill two cells.
    expect(picked(grid)).toEqual([
      ["childhood_classic", 1],
      ["all_time_favourite", 1],
      ["best_ending", 3],
    ]);
    expect(grid.updatedAt).not.toBeNull();
  });

  it("replaces a cell, and clears one", async () => {
    const { pick, clear } = setup();
    await pick("best_story", 1);
    await pick("best_story", 2);
    expect(picked((await pick("hidden_gem", 4)).body)).toEqual([
      ["best_story", 2],
      ["hidden_gem", 4],
    ]);

    expect(picked((await clear("best_story")).body)).toEqual([
      ["hidden_gem", 4],
    ]);
  });

  it("moves the picture's version on every change", async () => {
    const { pick, clear } = setup();
    const first = (await pick("best_story", 1)).body.updatedAt;
    const second = (await clear("best_story")).body.updatedAt;
    expect(second > first).toBe(true);
  });

  it("refuses a category it doesn't have, a missing game and an adult one", async () => {
    const { pick, app } = setup();
    expect((await pick("best_shoes", 1)).status).toBe(422);
    expect((await pick("best_story", 404)).status).toBe(404);
    expect((await pick("best_story", 9)).status).toBe(422);
    expect(
      (
        await request(app).put("/api/v1/me/gaming-25/picks/best_story").send({
          gameId: 1,
        })
      ).status,
    ).toBe(401);
  });

  it("leaves out a game flagged adult since it was picked", async () => {
    const { pick, get, state } = setup();
    await pick("best_story", 1);
    await pick("hidden_gem", 2);
    // Replaced, not changed in place: the fixture games are shared.
    state.games = state.games.map((g) =>
      g.id === 2 ? { ...g, has_sexual_content: true } : g,
    );

    expect(picked((await get("devuser")).body)).toEqual([["best_story", 1]]);
  });
});

describe("who sees a Gaming 25", () => {
  it("follows the profile: friends see a friends-only one, strangers don't", async () => {
    const { pick, get } = setup({
      profiles: [
        buildProfile({ profile_visibility: "friends" }),
        buildProfile({ id: USER_B, username: "frienduser" }),
        buildProfile({ id: STRANGER, username: "stranger" }),
      ],
      friendships: [buildFriendship({ status: "accepted" })],
    });
    await pick("best_story", 1);

    expect((await get("devuser", USER_A)).status).toBe(200);
    expect((await get("devuser", USER_B)).status).toBe(200);
    expect((await get("devuser", STRANGER)).status).toBe(403);
    expect((await get("devuser")).status).toBe(403);
    expect((await get("nobody")).status).toBe(404);
  });
});

describe("loving one", () => {
  it("toggles, counts, and says who loved it", async () => {
    const { pick, love, get } = setup();
    await pick("best_story", 1);

    expect((await love("devuser", USER_B)).body).toEqual({
      loveCount: 1,
      lovedByViewer: true,
    });
    expect((await get("devuser", USER_B)).body).toMatchObject({
      loveCount: 1,
      lovedByViewer: true,
    });
    expect((await get("devuser")).body.lovedByViewer).toBe(false);
    expect((await love("devuser", USER_B)).body.loveCount).toBe(0);
  });

  it("refuses your own, an empty one, and one you can't see", async () => {
    const { pick, love } = setup({
      profiles: [
        buildProfile(),
        buildProfile({ id: USER_B, username: "frienduser" }),
        buildProfile({
          id: STRANGER,
          username: "stranger",
          profile_visibility: "private",
        }),
      ],
    });
    await pick("best_story", 1);
    await pick("best_story", 2, STRANGER);

    expect((await love("devuser", USER_A)).status).toBe(403);
    expect((await love("frienduser", USER_A)).status).toBe(404);
    expect((await love("stranger", USER_A)).status).toBe(403);
  });

  it("tells its owner at a milestone", async () => {
    const { pick, love, state } = setup();
    await pick("best_story", 1);
    const fans = Array.from(
      { length: 5 },
      (_, i) => `00000000-0000-0000-0000-${String(i).padStart(12, "0")}`,
    );
    for (const fan of fans) await love("devuser", fan);

    expect(
      state.notifications.find(
        (n) => n.dedupe_key === `gaming_25_loves:${USER_A}`,
      ),
    ).toMatchObject({
      user_id: USER_A,
      kind: "gaming_25_love_milestone",
      data: { username: "devuser", milestone: 5 },
    });
  });
});

describe("most loved", () => {
  it("shows public grids with enough picks, the most loved first", async () => {
    const { app, pick, love } = setup({
      profiles: [
        buildProfile(),
        buildProfile({ id: USER_B, username: "frienduser" }),
        buildProfile({
          id: STRANGER,
          username: "stranger",
          profile_visibility: "friends",
        }),
      ],
    });
    const fill = async (user: string, count: number) => {
      const keys = [
        "all_time_favourite",
        "best_story",
        "hidden_gem",
        "best_rpg",
        "best_indie",
        "best_world",
      ];
      for (const key of keys.slice(0, count)) await pick(key, 1, user);
    };
    await fill(USER_A, 5);
    await fill(USER_B, 6);
    await fill(STRANGER, 6);
    await love("devuser", USER_B);

    const listed = (await request(app).get("/api/v1/gaming-25/most-loved"))
      .body as { owner: { username: string }; loveCount: number }[];
    expect(listed.map((g) => g.owner.username)).toEqual([
      "devuser",
      "frienduser",
    ]);
    expect(listed[0]).toMatchObject({
      loveCount: 1,
      pickCount: 5,
      centre: { id: 1, title: "Game 1" },
    });

    await request(app)
      .delete("/api/v1/me/gaming-25/picks/best_rpg")
      .set(as(USER_A));
    const after = (await request(app).get("/api/v1/gaming-25/most-loved"))
      .body as { owner: { username: string } }[];
    expect(after.map((g) => g.owner.username)).toEqual(["frienduser"]);
  });
});

describe("the shared picture", () => {
  const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

  // Draws two pictures, which can outlast the default timeout in a full run.
  it("draws a public grid, with the covers it could fetch", async () => {
    const jpeg = await sharp({
      create: { width: 4, height: 6, channels: 3, background: "#884422" },
    })
      .jpeg()
      .toBuffer();
    const fetched: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        fetched.push(url);
        return url.includes("co1")
          ? new Response(jpeg, { headers: { "content-type": "image/jpeg" } })
          : new Response("gone", { status: 404 });
      }),
    );
    const { app, pick } = setup();
    await pick("all_time_favourite", 1);
    await pick("best_story", 2);

    const res = await request(app)
      .get("/api/v1/gaming-25/devuser/image.png?v=1")
      .buffer(true);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("image/png");
    expect(res.headers["cache-control"]).toContain("immutable");
    expect(res.headers["cross-origin-resource-policy"]).toBe("cross-origin");
    expect((res.body as Buffer).subarray(0, 4)).toEqual(PNG);
    // Small covers, not the 2x box art the page uses.
    expect(fetched).toContain(
      "https://images.igdb.com/igdb/image/upload/t_cover_big/co1.jpg",
    );
    const { width, height } = await sharp(res.body as Buffer).metadata();
    expect([width, height]).toEqual([1080, 1350]);

    const wide = await request(app)
      .get("/api/v1/gaming-25/devuser/image.png?layout=wide")
      .buffer(true);
    expect(wide.headers["cache-control"]).not.toContain("immutable");
    const size = await sharp(wide.body as Buffer).metadata();
    expect([size.width, size.height]).toEqual([1200, 630]);
  }, 20_000);

  it("isn't drawn for a profile that isn't public", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const { app, pick } = setup({
      profiles: [buildProfile({ profile_visibility: "friends" })],
    });
    await pick("best_story", 1);

    expect(
      (await request(app).get("/api/v1/gaming-25/devuser/image.png")).status,
    ).toBe(404);
  });
});

describe("its page's preview", () => {
  it("shows the picture and the centre pick where anyone may see it", async () => {
    const { app, pick } = setup();
    await pick("best_story", 2);
    await pick("all_time_favourite", 1);

    const page = await request(app).get("/user/devuser/gaming-25");

    expect(page.status).toBe(200);
    expect(page.text).toContain(
      "<title>devuser&#39;s Gaming 25 / PlayRates</title>",
    );
    expect(page.text).toContain(
      "Favourite game: Game 1 · Best story: Game 2. 2 of 25 picked on PlayRates.",
    );
    expect(page.text).toMatch(
      /og:image" content="[^"]*\/api\/v1\/gaming-25\/devuser\/image\.png\?layout=wide&amp;v=2\.\d+"/,
    );
  });

  it("says nothing in particular for a private profile", async () => {
    const { app, pick } = setup({
      profiles: [buildProfile({ profile_visibility: "private" })],
    });
    await pick("best_story", 1);

    const page = await request(app).get("/user/devuser/gaming-25");
    expect(page.text).toContain("<title>A Gaming 25 / PlayRates</title>");
    expect(page.text).not.toContain("Game 1");
    expect(page.text).toContain("noindex");
  });
});

describe("account data", () => {
  it("goes in the export, and goes with the account", async () => {
    const { app, pick, love, state, repos } = setup();
    await pick("best_story", 1);
    await pick("best_story", 2, USER_B);
    await love("frienduser", USER_A);
    await love("devuser", USER_B);

    const exported = await request(app)
      .get("/api/v1/profiles/me/export")
      .set(as(USER_A));
    expect(exported.body.gaming25).toHaveLength(1);
    expect(exported.body.gaming25Picks).toHaveLength(1);
    expect(exported.body.gaming25Loves).toEqual([
      { owner_id: USER_B, user_id: USER_A },
    ]);

    await request(app).delete("/api/v1/profiles/me").set(as(USER_A));
    expect(state.gaming25s.map((g) => g.user_id)).toEqual([USER_B]);
    expect(state.gaming25Loves).toEqual([]);
    expect(await repos.gaming25.loveCount(USER_B)).toBe(0);
  });
});
