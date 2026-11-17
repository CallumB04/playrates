import { describe, expect, it } from "vitest";
import request from "supertest";
import {
  authHeader,
  buildTestApp,
  USER_A,
  USER_B,
} from "../helpers/buildTestApp.js";
import {
  baseSeed,
  buildAwardCategory,
  buildAwardNominee,
  buildAwardShow,
  buildEvent,
  buildGame,
  buildProfile,
} from "../helpers/fixtures.js";

const ADMIN = "33333333-3333-3333-3333-333333333333";
const SLUG = "the-game-awards-2026";

const games = [
  buildGame({ id: 1, slug: "game-1", title: "Game 1" }),
  buildGame({ id: 2, slug: "game-2", title: "Game 2" }),
  buildGame({ id: 3, slug: "game-3", title: "Game 3" }),
  buildGame({
    id: 4,
    slug: "adult-game",
    title: "Adult Game",
    has_sexual_content: true,
  }),
];

/** Game of the Year with games 1 and 2, Best Score with a named nominee. */
const seed = (extra: object = {}) => {
  const base = baseSeed();
  return {
    ...base,
    profiles: [
      ...base.profiles,
      buildProfile({ id: ADMIN, username: "calbgyn", is_admin: true }),
    ],
    games,
    events: [buildEvent()],
    awardShows: [buildAwardShow()],
    awardCategories: [
      buildAwardCategory(),
      buildAwardCategory({
        id: 11,
        slug: "best-score",
        name: "Best Score",
        section: "Craft",
        position: 1,
        headline: false,
      }),
    ],
    awardNominees: [
      buildAwardNominee(),
      buildAwardNominee({ id: 101, game_id: 2, position: 1 }),
      buildAwardNominee({
        id: 110,
        category_id: 11,
        game_id: 3,
        label: "A Composer",
      }),
    ],
    ...extra,
  };
};

const setup = (extra: object = {}) => buildTestApp({ seed: seed(extra) });

const pick = (
  app: ReturnType<typeof setup>["app"],
  categoryId: number,
  nomineeId: number,
  user = USER_A,
) =>
  request(app)
    .put(`/api/v1/me/events/${SLUG}/picks/${categoryId}`)
    .set("Authorization", authHeader(user))
    .send({ nomineeId });

const admin = (path: string) => `/api/v1/admin/events${path}`;

const NEW_EVENT = {
  kind: "awards",
  slug: "next-awards",
  name: "Next Awards",
  tagline: "The next one.",
  startsAt: "2099-12-11T00:30:00Z",
  awards: { picksCloseAt: "2099-12-11T00:30:00Z" },
};

describe("events for visitors", () => {
  it("lists published events with their kind's summary, and leaves drafts out", async () => {
    const { app } = setup({
      events: [
        buildEvent(),
        buildEvent({ id: 2, slug: "draft-awards", published_at: null }),
      ],
    });

    const response = await request(app).get("/api/v1/events");

    expect(response.status).toBe(200);
    expect(response.body.map((e: { slug: string }) => e.slug)).toEqual([SLUG]);
    expect(response.body[0]).toMatchObject({
      kind: "awards",
      timing: "upcoming",
      logo: "the-game-awards",
      awards: { phase: "open", categoryCount: 2, nomineeCount: 3 },
    });
  });

  it("shows an awards night's categories and nominees, games and names alike", async () => {
    const { app } = setup();

    const response = await request(app).get(`/api/v1/events/${SLUG}`);

    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toMatch(/s-maxage/);
    const [goty, score] = response.body.awards.categories;
    expect(goty.name).toBe("Game of the Year");
    expect(
      goty.nominees.map((n: { game: { title: string } }) => n.game.title),
    ).toEqual(["Game 1", "Game 2"]);
    expect(score).toMatchObject({
      section: "Craft",
      nominees: [{ label: "A Composer", game: { title: "Game 3" } }],
    });
  });

  it("answers 404 for a draft and for an event that isn't there", async () => {
    const { app } = setup({ events: [buildEvent({ published_at: null })] });

    expect((await request(app).get(`/api/v1/events/${SLUG}`)).status).toBe(404);
    expect((await request(app).get("/api/v1/events/nope")).status).toBe(404);
  });

  it("leaves out a nominee whose game has since been marked adult", async () => {
    const { app } = setup({
      awardNominees: [
        buildAwardNominee(),
        buildAwardNominee({ id: 104, game_id: 4 }),
      ],
    });

    const response = await request(app).get(`/api/v1/events/${SLUG}`);

    expect(response.body.awards.categories[0].nominees).toHaveLength(1);
  });

  it("counts the crowd's picks without naming anyone", async () => {
    const { app } = setup();
    await pick(app, 10, 100);
    await pick(app, 10, 100, USER_B);

    const response = await request(app).get(`/api/v1/events/${SLUG}`);

    expect(response.body.awards.categories[0].nominees[0].picks).toBe(2);
    expect(JSON.stringify(response.body)).not.toContain(USER_A);
  });

  it("puts the soonest current event on home, and none once it's two weeks gone", async () => {
    const live = setup().app;
    expect(
      (await request(live).get("/api/v1/events/current")).body,
    ).toMatchObject({ slug: SLUG, covers: expect.any(Array) });

    const past = setup({
      events: [buildEvent({ starts_at: "2020-12-11T00:30:00.000Z" })],
    }).app;
    expect((await request(past).get("/api/v1/events/current")).body).toBeNull();
  });

  it("tells a live event from one to come and one gone", async () => {
    const { app } = setup({
      events: [
        buildEvent({
          id: 1,
          starts_at: new Date(Date.now() - 60_000).toISOString(),
        }),
        buildEvent({
          id: 2,
          slug: "old-awards",
          starts_at: "2020-12-11T00:30:00.000Z",
        }),
      ],
      awardShows: [buildAwardShow(), buildAwardShow({ event_id: 2 })],
    });

    const timings = (await request(app).get("/api/v1/events")).body.map(
      (e: { slug: string; timing: string }) => [e.slug, e.timing],
    );

    expect(timings).toEqual([
      [SLUG, "live"],
      ["old-awards", "past"],
    ]);
  });
});

describe("a game's events", () => {
  it("names the award it's up for, and the win once the results are out", async () => {
    const before = setup().app;
    expect(
      (await request(before).get("/api/v1/games/2/events")).body,
    ).toMatchObject([
      {
        event: {
          slug: SLUG,
          kind: "awards",
          name: "The Game Awards 2026",
          timing: "upcoming",
          logo: "the-game-awards",
        },
        awards: {
          phase: "open",
          nominations: [
            { category: "Game of the Year", headline: true, won: false },
          ],
        },
        showcase: null,
      },
    ]);

    const after = setup({
      awardShows: [buildAwardShow({ results_at: "2026-12-11T04:00:00.000Z" })],
      awardNominees: [buildAwardNominee({ id: 101, game_id: 2, won: true })],
    }).app;
    expect(
      (await request(after).get("/api/v1/games/2/events")).body[0].awards,
    ).toEqual({
      phase: "results",
      nominations: [
        { category: "Game of the Year", headline: true, won: true },
      ],
    });
  });

  it("puts the events still to come before the ones gone", async () => {
    const { app } = setup({
      events: [
        buildEvent({
          id: 2,
          slug: "old-awards",
          starts_at: "2020-12-11T00:30:00Z",
        }),
        buildEvent(),
      ],
      awardShows: [buildAwardShow(), buildAwardShow({ event_id: 2 })],
      awardCategories: [
        buildAwardCategory(),
        buildAwardCategory({ id: 20, event_id: 2 }),
      ],
      awardNominees: [
        buildAwardNominee(),
        buildAwardNominee({ id: 200, category_id: 20 }),
      ],
    });

    const slugs = (await request(app).get("/api/v1/games/1/events")).body.map(
      (e: { event: { slug: string } }) => e.event.slug,
    );

    expect(slugs).toEqual([SLUG, "old-awards"]);
  });

  it("keeps a draft event off the game page", async () => {
    const { app } = setup({ events: [buildEvent({ published_at: null })] });

    expect((await request(app).get("/api/v1/games/1/events")).body).toEqual([]);
  });

  it("is empty for a game at no event", async () => {
    expect(
      (await request(setup().app).get("/api/v1/games/99/events")).body,
    ).toEqual([]);
  });
});

describe("picks", () => {
  it("keeps a pick per category, and changes and clears it", async () => {
    const { app } = setup();

    expect((await pick(app, 10, 100)).body).toEqual({ "10": 100 });
    expect((await pick(app, 11, 110)).body).toEqual({ "10": 100, "11": 110 });
    expect((await pick(app, 10, 101)).body).toEqual({ "10": 101, "11": 110 });

    const cleared = await request(app)
      .delete(`/api/v1/me/events/${SLUG}/picks/10`)
      .set("Authorization", authHeader(USER_A));
    expect(cleared.body).toEqual({ "11": 110 });

    const mine = await request(app)
      .get(`/api/v1/me/events/${SLUG}/picks`)
      .set("Authorization", authHeader(USER_A));
    expect(mine.body).toEqual({ "11": 110 });
  });

  it("keeps each member's picks their own", async () => {
    const { app } = setup();
    await pick(app, 10, 100);

    const theirs = await request(app)
      .get(`/api/v1/me/events/${SLUG}/picks`)
      .set("Authorization", authHeader(USER_B));

    expect(theirs.body).toEqual({});
  });

  it("refuses a signed-out visitor", async () => {
    const { app } = setup();

    expect(
      (
        await request(app)
          .put(`/api/v1/me/events/${SLUG}/picks/10`)
          .send({ nomineeId: 100 })
      ).status,
    ).toBe(401);
    expect(
      (await request(app).get(`/api/v1/me/events/${SLUG}/picks`)).status,
    ).toBe(401);
  });

  it("refuses a pick once picks have closed", async () => {
    const { app, state } = setup({
      awardShows: [
        buildAwardShow({ picks_close_at: "2020-01-01T00:00:00.000Z" }),
      ],
    });

    const response = await pick(app, 10, 100);

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe("Picks have closed");
    expect(state.awardPicks).toEqual([]);
  });

  it("refuses a pick once the winners are out", async () => {
    const { app } = setup({
      awardShows: [buildAwardShow({ results_at: "2026-12-11T04:00:00.000Z" })],
    });

    expect((await pick(app, 10, 100)).status).toBe(400);
  });

  it("refuses another category's nominee", async () => {
    const { app, state } = setup();

    expect((await pick(app, 10, 110)).status).toBe(404);
    expect(state.awardPicks).toEqual([]);
  });

  it("refuses a category from another event", async () => {
    const { app } = setup({
      events: [buildEvent(), buildEvent({ id: 2, slug: "other-awards" })],
      awardShows: [buildAwardShow(), buildAwardShow({ event_id: 2 })],
      awardCategories: [
        buildAwardCategory(),
        buildAwardCategory({ id: 20, event_id: 2, slug: "goty" }),
      ],
    });

    expect((await pick(app, 20, 100)).status).toBe(404);
  });

  it("refuses a draft event", async () => {
    const { app } = setup({ events: [buildEvent({ published_at: null })] });

    expect((await pick(app, 10, 100)).status).toBe(404);
  });

  it("refuses a body that isn't one nominee", async () => {
    const { app } = setup();

    const response = await request(app)
      .put(`/api/v1/me/events/${SLUG}/picks/10`)
      .set("Authorization", authHeader(USER_A))
      .send({ nomineeId: 100, userId: USER_B });

    expect(response.status).toBe(422);
  });

  it("goes into the account export, and with the account when it's deleted", async () => {
    const { app, state } = setup();
    await pick(app, 10, 100);

    const exported = await request(app)
      .get("/api/v1/profiles/me/export")
      .set("Authorization", authHeader(USER_A));
    expect(exported.body.awardPicks).toEqual([
      { user_id: USER_A, category_id: 10, nominee_id: 100 },
    ]);
    expect(exported.body).toMatchObject({
      showcaseHype: [],
      eventBadges: [],
    });

    const deleted = await request(app)
      .delete("/api/v1/profiles/me")
      .set("Authorization", authHeader(USER_A));
    expect(deleted.status).toBe(204);
    expect(state.awardPicks).toEqual([]);
  });
});

describe("event badges", () => {
  const badgesOf = async (app: ReturnType<typeof setup>["app"]) =>
    (
      await request(app)
        .get(`/api/v1/me/events/${SLUG}/badges`)
        .set("Authorization", authHeader(USER_A))
    ).body;

  it("lists an event's badges with how many have each", async () => {
    const { app } = setup({
      eventBadges: [{ user_id: USER_B, event_id: 1, badge: "full-ballot" }],
    });

    const response = await request(app).get(`/api/v1/events/${SLUG}`);

    expect(
      response.body.badges.map((b: { key: string; earned: number }) => [
        b.key,
        b.earned,
      ]),
    ).toEqual([
      ["full-ballot", 1],
      ["called-it", 0],
      ["sharp-eye", 0],
    ]);
  });

  it("gives a full ballot with the last pick, and takes it back with one cleared", async () => {
    const { app } = setup();

    await pick(app, 10, 100);
    expect(await badgesOf(app)).toEqual([]);
    await pick(app, 11, 110);
    expect(await badgesOf(app)).toEqual(["full-ballot"]);

    await request(app)
      .delete(`/api/v1/me/events/${SLUG}/picks/11`)
      .set("Authorization", authHeader(USER_A));
    expect(await badgesOf(app)).toEqual([]);
  });

  it("gives Called it to whoever picked the top award's winner, and takes it back with the win", async () => {
    const { app, state } = setup({
      awardPicks: [
        { user_id: USER_A, category_id: 10, nominee_id: 100 },
        { user_id: USER_B, category_id: 10, nominee_id: 101 },
      ],
    });
    const asAdmin = (path: string, won: boolean) =>
      request(app)
        .put(admin(path))
        .set("Authorization", authHeader(ADMIN))
        .send({ won });

    await asAdmin("/nominees/100/won", true);
    expect(state.eventBadges).toEqual([
      { user_id: USER_A, event_id: 1, badge: "called-it" },
    ]);

    await asAdmin("/nominees/100/won", false);
    expect(state.eventBadges).toEqual([]);
  });

  it("gives Sharp eye for half the winners, from three decided", async () => {
    const { app, state } = setup({
      awardCategories: [
        buildAwardCategory(),
        buildAwardCategory({ id: 11, slug: "b", headline: false, position: 1 }),
        buildAwardCategory({ id: 12, slug: "c", headline: false, position: 2 }),
      ],
      awardNominees: [
        buildAwardNominee({ id: 100, category_id: 10, won: true }),
        buildAwardNominee({ id: 110, category_id: 11, game_id: 2, won: true }),
        buildAwardNominee({ id: 120, category_id: 12, game_id: 3 }),
        buildAwardNominee({ id: 121, category_id: 12, game_id: 2 }),
      ],
      awardPicks: [
        { user_id: USER_A, category_id: 10, nominee_id: 100 },
        { user_id: USER_A, category_id: 11, nominee_id: 110 },
        { user_id: USER_A, category_id: 12, nominee_id: 120 },
        { user_id: USER_B, category_id: 12, nominee_id: 121 },
      ],
    });

    await request(app)
      .put(admin("/nominees/121/won"))
      .set("Authorization", authHeader(ADMIN))
      .send({ won: true });

    expect(state.eventBadges.filter((b) => b.badge === "sharp-eye")).toEqual([
      { user_id: USER_A, event_id: 1, badge: "sharp-eye" },
    ]);
  });

  it("keeps your badges to you, and refuses a signed-out visitor", async () => {
    const { app } = setup({
      eventBadges: [{ user_id: USER_B, event_id: 1, badge: "full-ballot" }],
    });

    expect(await badgesOf(app)).toEqual([]);
    expect(
      (await request(app).get(`/api/v1/me/events/${SLUG}/badges`)).status,
    ).toBe(401);
  });
});

describe("a showcase", () => {
  const SHOW = "winter-showcase";
  const showcaseSeed = (event: Parameters<typeof buildEvent>[0] = {}) => ({
    events: [
      buildEvent(),
      buildEvent({
        id: 2,
        kind: "showcase",
        slug: SHOW,
        name: "Winter Showcase",
        logo: null,
        starts_at: new Date(Date.now() - 60_000).toISOString(),
        ends_at: new Date(Date.now() + 3_600_000).toISOString(),
        ...event,
      }),
    ],
    showcaseEvents: [2],
    showcaseReveals: [
      {
        id: 500,
        event_id: 2,
        game_id: 2,
        label: null,
        tag: "premiere",
        position: 0,
      },
      {
        id: 501,
        event_id: 2,
        game_id: null,
        label: "A new IP",
        tag: "trailer",
        position: 1,
      },
      {
        id: 502,
        event_id: 2,
        game_id: 4,
        label: null,
        tag: "date",
        position: 2,
      },
    ],
  });
  const hype = (
    app: ReturnType<typeof setup>["app"],
    revealId: number,
    on = true,
  ) => {
    const path = `/api/v1/me/events/${SHOW}/hype/${revealId}`;
    const req = on ? request(app).put(path) : request(app).delete(path);
    return req.set("Authorization", authHeader(USER_A));
  };

  it("shows its reveals in running order, with no awards about it", async () => {
    const { app } = setup(showcaseSeed());

    const response = await request(app).get(`/api/v1/events/${SHOW}`);

    expect(response.body).toMatchObject({
      kind: "showcase",
      timing: "live",
      awards: null,
      showcase: {
        revealCount: 2,
        reveals: [
          { id: 500, game: { title: "Game 2" }, tag: "premiere", hype: 0 },
          { id: 501, game: null, label: "A new IP", tag: "trailer" },
        ],
      },
    });
    expect(response.body.badges.map((b: { key: string }) => b.key)).toEqual([
      "front-row",
      "hype-train",
    ]);
  });

  it("counts hype, and gives Front row for hyping while it's on", async () => {
    const { app, state } = setup(showcaseSeed());

    expect((await hype(app, 500)).body).toEqual([500]);
    expect((await hype(app, 501)).body).toEqual([500, 501]);
    expect((await hype(app, 500, false)).body).toEqual([501]);

    const shown = await request(app).get(`/api/v1/events/${SHOW}`);
    expect(
      shown.body.showcase.reveals.map((r: { hype: number }) => r.hype),
    ).toEqual([0, 1]);
    expect(state.eventBadges).toEqual([
      {
        user_id: USER_A,
        event_id: 2,
        badge: "front-row",
        earned_at: expect.any(String),
      },
    ]);
  });

  it("gives a Hype train for five while it's current, and no Front row once it's over", async () => {
    const reveals = Array.from({ length: 5 }, (_, i) => ({
      id: 600 + i,
      event_id: 2,
      game_id: null,
      label: `Reveal ${i}`,
      tag: "trailer" as const,
      position: i,
    }));
    const { app, state } = setup({
      ...showcaseSeed({
        starts_at: new Date(Date.now() - 2 * 86_400_000).toISOString(),
        ends_at: new Date(Date.now() - 86_400_000).toISOString(),
      }),
      showcaseReveals: reveals,
    });

    for (const reveal of reveals) await hype(app, reveal.id);

    expect(state.eventBadges.map((b) => b.badge)).toEqual(["hype-train"]);
  });

  it("puts a game's showing on its page, beside its nominations", async () => {
    const { app } = setup(showcaseSeed());
    await hype(app, 500);

    const entries = (await request(app).get("/api/v1/games/2/events")).body;

    expect(
      entries.map((e: { event: { kind: string } }) => e.event.kind),
    ).toEqual(["showcase", "awards"]);
    expect(entries[0].showcase).toEqual({ tag: "premiere", hype: 1 });
  });

  it("refuses hype for another event's reveal, a draft, or a signed-out visitor", async () => {
    const { app } = setup({
      ...showcaseSeed(),
      showcaseReveals: [
        {
          id: 500,
          event_id: 2,
          game_id: 2,
          label: null,
          tag: "premiere",
          position: 0,
        },
        {
          id: 700,
          event_id: 3,
          game_id: 2,
          label: null,
          tag: "premiere",
          position: 0,
        },
      ],
    });

    expect((await hype(app, 700)).status).toBe(404);
    expect(
      (
        await request(app)
          .put(`/api/v1/me/events/${SLUG}/hype/500`)
          .set("Authorization", authHeader(USER_A))
      ).status,
    ).toBe(404);
    expect(
      (await request(app).put(`/api/v1/me/events/${SHOW}/hype/500`)).status,
    ).toBe(401);
  });

  it("is built and edited from admin like any event", async () => {
    const { app } = setup();
    const asAdmin = (req: request.Test) =>
      req.set("Authorization", authHeader(ADMIN));

    const created = await asAdmin(request(app).post(admin("/"))).send({
      kind: "showcase",
      slug: "spring-showcase",
      name: "Spring Showcase",
      tagline: "New games, live.",
      startsAt: "2099-03-01T18:00:00Z",
    });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      kind: "showcase",
      awards: null,
      showcase: { reveals: [] },
    });
    const id = created.body.id as number;

    await asAdmin(request(app).post(admin(`/${id}/reveals`))).send({
      gameId: 1,
      tag: "premiere",
    });
    const two = await asAdmin(request(app).post(admin(`/${id}/reveals`))).send({
      label: "One more thing",
      tag: "shadow-drop",
    });
    const [first, second] = two.body.showcase.reveals;

    const reordered = await asAdmin(
      request(app).put(admin(`/${id}/reveals/order`)),
    ).send({ ids: [second.id, first.id] });
    expect(
      reordered.body.showcase.reveals.map(
        (r: { label: string | null }) => r.label,
      ),
    ).toEqual(["One more thing", null]);

    const less = await asAdmin(
      request(app).delete(admin(`/reveals/${first.id}`)),
    );
    expect(less.body.showcase.reveals).toHaveLength(1);

    expect(
      (
        await asAdmin(request(app).post(admin(`/${id}/reveals`))).send({
          gameId: 4,
          tag: "date",
        })
      ).status,
    ).toBe(422);
    expect(
      (
        await asAdmin(request(app).post(admin("/1/reveals"))).send({
          label: "Not here",
          tag: "date",
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await asAdmin(request(app).put(admin(`/${id}/reveals/order`))).send({
          ids: [second.id, 99],
        })
      ).status,
    ).toBe(422);
    expect(
      (await asAdmin(request(app).delete(admin("/reveals/99")))).status,
    ).toBe(404);
  });

  it("refuses a showcase given an awards night's settings", async () => {
    const { app } = setup();

    const response = await request(app)
      .post(admin("/"))
      .set("Authorization", authHeader(ADMIN))
      .send({ ...NEW_EVENT, kind: "showcase" });

    expect(response.status).toBe(422);
  });
});

describe("running events from admin", () => {
  const asAdmin = (req: request.Test) =>
    req.set("Authorization", authHeader(ADMIN));

  it("is hidden from anyone who isn't an admin", async () => {
    const { app } = setup();

    expect(
      (
        await request(app)
          .get(admin("/"))
          .set("Authorization", authHeader(USER_A))
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app)
          .put(admin("/nominees/100/won"))
          .set("Authorization", authHeader(USER_A))
          .send({ won: true })
      ).status,
    ).toBe(404);
  });

  it("builds an awards night from nothing, a draft until it's published", async () => {
    const { app } = buildTestApp({
      seed: seed({
        events: [],
        awardShows: [],
        awardCategories: [],
        awardNominees: [],
      }),
    });

    const created = await asAdmin(request(app).post(admin("/"))).send(
      NEW_EVENT,
    );
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      kind: "awards",
      publishedAt: null,
      awards: { phase: "open", categories: [] },
    });
    const id = created.body.id as number;

    await asAdmin(request(app).post(admin(`/${id}/categories`))).send({
      slug: "game-of-the-year",
      name: "Game of the Year",
      headline: true,
    });
    const withScore = await asAdmin(
      request(app).post(admin(`/${id}/categories`)),
    ).send({ slug: "best-score", name: "Best Score", section: "Craft" });
    const [goty, score] = withScore.body.awards.categories;

    await asAdmin(
      request(app).post(admin(`/categories/${goty.id}/nominees`)),
    ).send({ gameId: 1 });
    await asAdmin(
      request(app).post(admin(`/categories/${goty.id}/nominees`)),
    ).send({ gameId: 2 });
    const named = await asAdmin(
      request(app).post(admin(`/categories/${score.id}/nominees`)),
    ).send({ label: "A Composer", detail: "Game 3" });
    expect(named.body.awards.categories[1]).toMatchObject({
      section: "Craft",
      nominees: [{ label: "A Composer", detail: "Game 3", game: null }],
    });

    expect((await request(app).get("/api/v1/events/next-awards")).status).toBe(
      404,
    );
    const published = await asAdmin(
      request(app).put(admin(`/${id}/published`)),
    ).send({ published: true });
    expect(published.body.publishedAt).not.toBeNull();
    expect(published.body.covers).toHaveLength(2);
    expect((await request(app).get("/api/v1/events/next-awards")).status).toBe(
      200,
    );

    const listed = await asAdmin(request(app).get(admin("/")));
    expect(listed.body.map((e: { slug: string }) => e.slug)).toEqual([
      "next-awards",
    ]);
  });

  it("refuses an awards night with nowhere for picks to close, and an end before the start", async () => {
    const { app } = setup();

    const noClose = await asAdmin(request(app).post(admin("/"))).send({
      ...NEW_EVENT,
      awards: null,
    });
    const backwards = await asAdmin(request(app).post(admin("/"))).send({
      ...NEW_EVENT,
      endsAt: "2099-12-10T00:30:00Z",
    });

    expect(noClose.status).toBe(422);
    expect(backwards.status).toBe(422);
  });

  it("keeps the first publish date when it's published again", async () => {
    const { app, state } = setup();

    await asAdmin(request(app).put(admin("/1/published"))).send({
      published: false,
    });
    expect(state.events[0]!.published_at).toBeNull();
    await asAdmin(request(app).put(admin("/1/published"))).send({
      published: true,
    });
    const first = state.events[0]!.published_at;
    await asAdmin(request(app).put(admin("/1/published"))).send({
      published: true,
    });
    expect(state.events[0]!.published_at).toBe(first);
  });

  it("edits an event, its picks' close, and a category", async () => {
    const { app } = setup();

    const event = await asAdmin(request(app).put(admin("/1"))).send({
      ...NEW_EVENT,
      slug: SLUG,
      name: "TGA 2026",
      organiserUrl: "https://thegameawards.com",
      awards: { picksCloseAt: "2099-12-10T00:00:00Z" },
    });
    expect(event.body).toMatchObject({
      name: "TGA 2026",
      organiserUrl: "https://thegameawards.com",
      awards: { picksCloseAt: "2099-12-10T00:00:00Z" },
    });

    const category = await asAdmin(
      request(app).put(admin("/categories/11")),
    ).send({
      slug: "best-score-and-music",
      name: "Best Score and Music",
      section: "Craft",
    });
    expect(category.body.awards.categories[1].name).toBe(
      "Best Score and Music",
    );
  });

  it("refuses a slug that's taken, and a category with no awards night", async () => {
    const { app } = setup({
      events: [buildEvent(), buildEvent({ id: 2, slug: "no-show" })],
    });

    const taken = await asAdmin(request(app).post(admin("/"))).send({
      ...NEW_EVENT,
      slug: SLUG,
    });
    const noShow = await asAdmin(
      request(app).post(admin("/2/categories")),
    ).send({ slug: "x", name: "X" });

    expect(taken.status).toBe(409);
    expect(noShow.status).toBe(404);
  });

  it("refuses an adult game, a game that isn't there, and a nominee with no name", async () => {
    const { app } = setup();
    const add = (body: object) =>
      asAdmin(request(app).post(admin("/categories/10/nominees"))).send(body);

    expect((await add({ gameId: 4 })).status).toBe(422);
    expect((await add({ gameId: 999 })).status).toBe(404);
    expect((await add({})).status).toBe(422);
    expect((await add({ gameId: 1 })).status).toBe(409);
  });

  it("reorders categories and nominees, and refuses a list that leaves one out", async () => {
    const { app } = setup();

    const categories = await asAdmin(
      request(app).put(admin("/1/categories/order")),
    ).send({ ids: [11, 10] });
    expect(
      categories.body.awards.categories.map((c: { id: number }) => c.id),
    ).toEqual([11, 10]);

    const nominees = await asAdmin(
      request(app).put(admin("/categories/10/nominees/order")),
    ).send({ ids: [101, 100] });
    expect(
      nominees.body.awards.categories[1].nominees.map(
        (n: { id: number }) => n.id,
      ),
    ).toEqual([101, 100]);

    expect(
      (
        await asAdmin(request(app).put(admin("/1/categories/order"))).send({
          ids: [10],
        })
      ).status,
    ).toBe(422);
    expect(
      (
        await asAdmin(
          request(app).put(admin("/categories/10/nominees/order")),
        ).send({ ids: [100, 110] })
      ).status,
    ).toBe(422);
  });

  it("marks one winner a category and opens the results with it", async () => {
    const { app, state } = setup();

    await asAdmin(request(app).put(admin("/nominees/100/won"))).send({
      won: true,
    });
    const switched = await asAdmin(
      request(app).put(admin("/nominees/101/won")),
    ).send({ won: true });

    expect(switched.body.awards.phase).toBe("results");
    expect(
      switched.body.awards.categories[0].nominees.map(
        (n: { won: boolean }) => n.won,
      ),
    ).toEqual([false, true]);

    const cleared = await asAdmin(
      request(app).put(admin("/nominees/101/won")),
    ).send({ won: false });
    expect(cleared.body.awards.phase).toBe("open");
    expect(state.awardShows[0]!.results_at).toBeNull();
  });

  it("deletes a nominee and a category, picks and all", async () => {
    const { app, state } = setup();
    await pick(app, 10, 100);
    await pick(app, 11, 110);

    const lessOne = await asAdmin(request(app).delete(admin("/nominees/100")));
    expect(lessOne.body.awards.categories[0].nominees).toHaveLength(1);

    const lessCategory = await asAdmin(
      request(app).delete(admin("/categories/11")),
    );
    expect(lessCategory.body.awards.categories).toHaveLength(1);
    expect(state.awardPicks).toEqual([]);
  });

  it("refuses to change an event's kind", async () => {
    const { app } = setup();

    const response = await asAdmin(request(app).put(admin("/1"))).send({
      ...NEW_EVENT,
      kind: "launch",
    });

    expect(response.status).toBe(422);
  });

  it("answers 404 for what isn't there", async () => {
    const { app } = setup();

    expect((await asAdmin(request(app).get(admin("/99")))).status).toBe(404);
    expect(
      (await asAdmin(request(app).put(admin("/99"))).send(NEW_EVENT)).status,
    ).toBe(404);
    expect(
      (await asAdmin(request(app).delete(admin("/categories/99")))).status,
    ).toBe(404);
    expect(
      (await asAdmin(request(app).delete(admin("/nominees/99")))).status,
    ).toBe(404);
    expect(
      (
        await asAdmin(request(app).put(admin("/99/published"))).send({
          published: true,
        })
      ).status,
    ).toBe(404);
  });
});

describe("GET /users/:username/event-badges", () => {
  const held = (extra: object = {}) =>
    seed({
      events: [
        buildEvent(),
        buildEvent({
          id: 2,
          slug: "draft-show",
          kind: "showcase",
          published_at: null,
        }),
      ],
      eventBadges: [
        {
          user_id: USER_A,
          event_id: 1,
          badge: "full-ballot",
          earned_at: "2026-11-18T10:00:00.000Z",
        },
        {
          user_id: USER_A,
          event_id: 1,
          badge: "called-it",
          earned_at: "2026-12-11T06:00:00.000Z",
        },
        { user_id: USER_A, event_id: 2, badge: "front-row" },
        { user_id: USER_B, event_id: 1, badge: "full-ballot" },
      ],
      ...extra,
    });

  it("lists someone's event badges, newest first, with the event each is from", async () => {
    const { app } = buildTestApp({ seed: held() });
    const res = await request(app).get("/api/v1/users/devuser/event-badges");
    expect(res.status).toBe(200);
    expect(res.body.map((b: { key: string }) => b.key)).toEqual([
      "called-it",
      "full-ballot",
    ]);
    expect(res.body[0]).toMatchObject({
      name: "Called it",
      earnedAt: "2026-12-11T06:00:00.000Z",
      event: { slug: SLUG, name: "The Game Awards 2026" },
    });
  });

  it("leaves out badges from an event that isn't published", async () => {
    const { app } = buildTestApp({ seed: held() });
    const res = await request(app).get("/api/v1/users/devuser/event-badges");
    expect(res.body.some((b: { key: string }) => b.key === "front-row")).toBe(
      false,
    );
  });

  it("refuses a private profile's badges to anyone but its owner", async () => {
    const base = held();
    const profiles = base.profiles.map((p) =>
      p.id === USER_A ? { ...p, profile_visibility: "private" } : p,
    );
    const { app } = buildTestApp({ seed: { ...base, profiles } });

    const visitor = await request(app).get(
      "/api/v1/users/devuser/event-badges",
    );
    expect(visitor.status).toBe(403);

    const stranger = await request(app)
      .get("/api/v1/users/devuser/event-badges")
      .set("Authorization", authHeader(USER_B));
    expect(stranger.status).toBe(403);

    const owner = await request(app)
      .get("/api/v1/users/devuser/event-badges")
      .set("Authorization", authHeader(USER_A));
    expect(owner.status).toBe(200);
    expect(owner.body).toHaveLength(2);
  });

  it("answers 404 for nobody by that name", async () => {
    const { app } = buildTestApp({ seed: held() });
    const res = await request(app).get("/api/v1/users/nobody/event-badges");
    expect(res.status).toBe(404);
  });
});
