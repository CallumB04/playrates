import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { QUESTS, SETUP_REWARD, xpForLevel } from "@playrates/shared";
import {
  authHeader,
  buildTestApp,
  USER_A,
  USER_B,
} from "../helpers/buildTestApp.js";
import {
  baseSeed,
  buildFriendship,
  buildProfile,
  buildReview,
} from "../helpers/fixtures.js";

const STRANGER = "33333333-3333-3333-3333-333333333333";
const NEWBIE = "44444444-4444-4444-4444-444444444444";

const as = (user: string) => ({ Authorization: authHeader(user) });

const setup = (overrides: object = {}) => {
  const built = buildTestApp({
    seed: {
      ...baseSeed(),
      profiles: [
        buildProfile(),
        buildProfile({ id: USER_B, username: "frienduser" }),
        buildProfile({ id: STRANGER, username: "stranger" }),
        buildProfile({
          id: NEWBIE,
          username: "newbie",
          created_at: new Date().toISOString(),
        }),
      ],
      friendships: [buildFriendship({ status: "accepted" })],
      ...overrides,
    },
  });
  const app: Express = built.app;
  const progress = async (user = USER_A) =>
    (await request(app).get("/api/v1/me/progress").set(as(user))).body;
  const xp = (user: string, source: string, key: string, amount?: number) =>
    built.repos.progress.awardXp(user, source, key, amount);
  const tokens = (user: string, amount: number) =>
    built.repos.progress.awardTokens(
      user,
      "test",
      `test:${Math.random()}`,
      amount,
    );
  return { ...built, app, progress, xp, tokens };
};

afterEach(() => vi.unstubAllGlobals());

describe("progress", () => {
  it("starts at level 1 and climbs with the ledger", async () => {
    const { progress, xp } = setup();
    expect((await progress()).level).toMatchObject({ level: 1, xp: 0 });

    await xp(USER_A, "quest", "q1", xpForLevel(3));
    const now = await progress();
    expect(now.level.level).toBe(3);
    // Levels 2 and 3 are worth 10 tokens each.
    expect(now.tokens).toBe(20);
    expect(now.unseen.tokens).toBe(20);
  });

  it("unlocks badges from the counts, once, with their XP and tokens", async () => {
    const { progress, state } = setup();
    state.progressMetrics.set(USER_A, { logged: 55 });

    const first = await progress();
    expect(first.unseen.badges.map((b: { metal: number }) => b.metal)).toEqual([
      1, 2,
    ]);
    // Bronze 50 and silver 150: level 2.
    expect(first.xp).toBe(200);

    const second = await progress();
    expect(second.xp).toBe(200);
    expect(state.userBadges.filter((b) => b.user_id === USER_A)).toHaveLength(
      2,
    );
  });

  it("pays a member from before progress one capped sum, once", async () => {
    const { progress, state, app } = setup();
    state.profiles.find((p) => p.id === USER_A)!.revealed_at = null;
    state.progressMetrics.set(USER_A, {
      logged: 600,
      finished: 250,
      mastered: 120,
      rated: 600,
      hours: 6000,
      reviews: 200,
      reviewUpvotes: 2000,
    });

    const first = await progress();
    expect(first.reveal).toBe(true);
    expect(first.tokens).toBe(300);
    expect(first.unseen.xp).toEqual([]);
    const again = await progress();
    expect(again.tokens).toBe(300);

    await request(app).post("/api/v1/me/progress/revealed").set(as(USER_A));
    const after = await progress();
    expect(after.reveal).toBe(false);
    // Nothing from the launch comes back as a toast or a second payment.
    expect(after.tokens).toBe(300);
    expect(after.unseen.xp).toEqual([]);
  });

  it("keeps a weekly streak and pays it once a week", async () => {
    const { progress, xp } = setup();
    await xp(USER_A, "rate", "rate:1");
    const result = await progress();
    expect(result.streak).toMatchObject({ weeks: 1, thisWeek: true });
    const streakXp = result.xp - 5;
    expect(streakXp).toBe(25);
    expect((await progress()).xp - 5).toBe(25);
  });

  it("completes a quest once its count is reached, and pays it once", async () => {
    const { progress, xp } = setup();
    const quest = (await progress()).quests.week[0] as {
      key: string;
      target: number;
    };
    const def = QUESTS.find((q) => q.key === quest.key)!;
    for (let i = 0; i < quest.target; i++)
      await xp(USER_A, def.sources[0]!, `step:${i}`);

    const after = await progress();
    expect(after.quests.week[0]).toMatchObject({
      done: true,
      count: quest.target,
    });
    const paid = after.xp;
    expect((await progress()).xp).toBe(paid);
  });

  it("clears what it has shown", async () => {
    const { app, progress, xp } = setup();
    await xp(USER_A, "rate", "rate:1");
    const seen = await progress();
    const last = seen.unseen.xp.at(-1).id;
    await request(app)
      .post("/api/v1/me/progress/seen")
      .set(as(USER_A))
      .send({ xpEventId: last });
    expect((await progress()).unseen.xp).toEqual([]);
  });
});

describe("the shop", () => {
  it("sells what you can afford and refuses the rest", async () => {
    const { app, tokens } = setup();
    await tokens(USER_A, 90);
    const buy = (item: string) =>
      request(app).post(`/api/v1/shop/${item}/buy`).set(as(USER_A));

    expect((await buy("font_pixel")).status).toBe(402);
    expect((await buy("frame_neon")).body).toEqual({ tokens: 30, owned: 1 });
    expect((await buy("frame_neon")).status).toBe(409);
    expect((await buy("not_a_thing")).status).toBe(422);

    const shop = (await request(app).get("/api/v1/shop").set(as(USER_A))).body;
    expect(shop.tokens).toBe(30);
    expect(
      shop.items.find((i: { item: string }) => i.item === "frame_neon"),
    ).toMatchObject({
      owned: 1,
      affordable: false,
    });
  });

  it("prices each slot higher than the last", async () => {
    const { app, tokens } = setup();
    await tokens(USER_A, 1000);
    const price = async () =>
      (await request(app).get("/api/v1/shop").set(as(USER_A))).body.items.find(
        (i: { item: string }) => i.item === "slot_showcase",
      ).price;
    expect(await price()).toBe(100);
    await request(app).post("/api/v1/shop/slot_showcase/buy").set(as(USER_A));
    expect(await price()).toBe(150);
  });
});

describe("style", () => {
  it("wears what's unlocked and refuses what isn't", async () => {
    const { app, xp, tokens } = setup();
    const style = (body: object) =>
      request(app)
        .patch("/api/v1/me/progress/style")
        .set(as(USER_A))
        .send(body);

    expect((await style({ frame: "gold" })).status).toBe(403);
    await xp(USER_A, "quest", "q", xpForLevel(20));
    expect((await style({ frame: "gold" })).status).toBe(204);

    expect((await style({ frame: "neon" })).status).toBe(403);
    await tokens(USER_A, 60);
    await request(app).post("/api/v1/shop/frame_neon/buy").set(as(USER_A));
    expect((await style({ frame: "neon" })).status).toBe(204);

    const me = await request(app).get("/api/v1/profiles/me").set(as(USER_A));
    expect(me.body).toMatchObject({ level: 20, frame: "neon" });

    expect((await style({ frame: "none" })).status).toBe(204);
    const bare = await request(app).get("/api/v1/profiles/me").set(as(USER_A));
    expect(bare.body.frame).toBeNull();
  });

  it("sets a name's font and colour by level or purchase", async () => {
    const { app, xp, tokens } = setup();
    const style = (body: object) =>
      request(app)
        .patch("/api/v1/me/progress/style")
        .set(as(USER_A))
        .send(body);

    expect((await style({ nameFont: "orbitron" })).status).toBe(403);
    await xp(USER_A, "quest", "q", xpForLevel(15));
    expect((await style({ nameFont: "orbitron" })).status).toBe(204);

    expect((await style({ nameColour: "ember" })).status).toBe(403);
    await tokens(USER_A, 40);
    await request(app).post("/api/v1/shop/colour_ember/buy").set(as(USER_A));
    expect((await style({ nameColour: "ember" })).status).toBe(204);

    const me = await request(app).get("/api/v1/profiles/devuser");
    expect(me.body).toMatchObject({
      nameFont: "orbitron",
      nameColour: "ember",
    });
  });

  it("shows only badges you hold, as many as you have slots for", async () => {
    const { app, progress, state } = setup();
    state.progressMetrics.set(USER_A, {
      logged: 10,
      rated: 10,
      reviews: 1,
      friends: 1,
      posts: 1,
      mastered: 1,
    });
    await progress();
    const style = (showcase: string[]) =>
      request(app)
        .patch("/api/v1/me/progress/style")
        .set(as(USER_A))
        .send({ showcase });

    expect((await style(["collector", "rater"])).status).toBe(204);
    expect((await style(["finisher"])).status).toBe(403);
    expect(
      (
        await style([
          "collector",
          "rater",
          "critic",
          "social_butterfly",
          "voice",
          "completionist",
        ])
      ).status,
    ).toBe(422);
  });

  it("leaves out a pinned badge that isn't held, such as a retired one", async () => {
    const { app, progress, state } = setup();
    state.progressMetrics.set(USER_A, { logged: 10 });
    await progress();
    state.profiles.find((p) => p.id === USER_A)!.showcase_badges = [
      "early_adopter",
      "collector",
    ];
    const res = await request(app).get("/api/v1/progress/devuser/badges");
    expect(res.body.showcase).toEqual(["collector"]);
  });
});

describe("tasks", () => {
  it("pays each task's tokens once, with its XP", async () => {
    const { progress, xp } = setup();
    const before = await progress();
    const task = before.quests.week[0] as { key: string; target: number };
    const def = QUESTS.find((q) => q.key === task.key)!;
    for (let i = 0; i < task.target; i++)
      await xp(USER_A, def.sources[0]!, `step:${i}`);

    const after = await progress();
    expect(after.quests.week[0]).toMatchObject({ done: true, tokens: 2 });
    expect(after.tokens - before.tokens).toBe(2);
    expect((await progress()).tokens).toBe(after.tokens);
  });
});

describe("getting started", () => {
  it("pays once every step is done, and only then", async () => {
    const { progress, state } = setup();
    const me = state.profiles.find((p) => p.id === USER_A)!;
    me.avatar_url = "https://example.test/a.png";
    me.bio = "Hello";
    state.progressMetrics.set(USER_A, {
      logged: 1,
      rated: 1,
      reviews: 1,
      friends: 1,
    });
    state.favouriteGames.push({ user_id: USER_A, game_id: 1, position: 1 });

    const almost = await progress();
    expect(almost.setup.steps).toMatchObject({ picture: true, post: false });
    expect(state.xpEvents.some((e) => e.key === "setup")).toBe(false);

    state.progressMetrics.set(USER_A, {
      logged: 1,
      rated: 1,
      reviews: 1,
      friends: 1,
      posts: 1,
    });
    await progress();
    await progress();
    expect(state.xpEvents.filter((e) => e.key === "setup")).toEqual([
      expect.objectContaining({ xp: SETUP_REWARD.xp }),
    ]);
    expect(state.tokenEvents.filter((e) => e.key === "setup")).toEqual([
      expect.objectContaining({ amount: SETUP_REWARD.tokens }),
    ]);
  });
});

describe("gifts", () => {
  it("buys an item for a friend, and tells them", async () => {
    const { app, tokens, state } = setup();
    await tokens(USER_A, 100);
    const gift = (item: string, username: string) =>
      request(app)
        .post(`/api/v1/shop/${item}/gift`)
        .set(as(USER_A))
        .send({ username });

    expect((await gift("frame_neon", "stranger")).status).toBe(403);
    expect((await gift("frame_neon", "frienduser")).body).toEqual({
      tokens: 40,
      cost: 60,
    });
    expect((await gift("frame_neon", "frienduser")).status).toBe(409);
    expect(
      state.userItems.find(
        (i) => i.user_id === USER_B && i.item === "frame_neon",
      ),
    ).toMatchObject({ quantity: 1 });
    expect(
      state.notifications.find((n) => n.kind === "gift_received"),
    ).toMatchObject({
      user_id: USER_B,
      data: { username: "devuser", item: "frame_neon" },
    });

    const friends = await request(app)
      .get("/api/v1/shop/frame_neon/friends")
      .set(as(USER_A));
    expect(friends.body).toEqual([
      expect.objectContaining({
        username: "frienduser",
        full: true,
        price: 60,
      }),
    ]);
  });
});

describe("pinned reviews", () => {
  it("pins your own reviews, as many as you've bought room for", async () => {
    const { app, tokens } = setup({
      reviews: [buildReview(), buildReview({ id: 2, user_id: USER_B })],
    });
    const pin = (ids: number[]) =>
      request(app)
        .patch("/api/v1/me/progress/style")
        .set(as(USER_A))
        .send({ pinnedReviews: ids });

    expect((await pin([1])).status).toBe(422);
    await tokens(USER_A, 60);
    await request(app)
      .post("/api/v1/shop/slot_pinned_review/buy")
      .set(as(USER_A));
    expect((await pin([2])).status).toBe(404);
    expect((await pin([1])).status).toBe(204);

    const me = await request(app).get("/api/v1/profiles/devuser");
    expect(me.body.pinnedReviews).toEqual([1]);

    const shown = await request(app).get(
      "/api/v1/users/devuser/reviews/pinned",
    );
    expect(shown.body.map((r: { id: number }) => r.id)).toEqual([1]);
  });
});

describe("referrals", () => {
  it("is said once, in the first week, never by yourself", async () => {
    const { app, state } = setup();
    const refer = (user: string, username: string) =>
      request(app).post("/api/v1/me/referral").set(as(user)).send({ username });

    expect((await refer(NEWBIE, "newbie")).status).toBe(404);
    expect((await refer(USER_B, "devuser")).status).toBe(409);
    expect((await refer(NEWBIE, "devuser")).status).toBe(204);
    expect((await refer(NEWBIE, "frienduser")).status).toBe(409);

    expect(state.notifications.find((n) => n.user_id === USER_A)).toMatchObject(
      {
        kind: "referral_joined",
      },
    );
    expect(
      state.xpEvents.find((e) => e.key === `ref:${NEWBIE}:joined`),
    ).toMatchObject({
      user_id: USER_A,
      xp: 50,
    });
  });

  it("pays both once the invited friend has logged 5 games", async () => {
    const { app, progress, state } = setup();
    await request(app)
      .post("/api/v1/me/referral")
      .set(as(NEWBIE))
      .send({ username: "devuser" });

    state.progressMetrics.set(NEWBIE, { logged: 4 });
    await progress(NEWBIE);
    expect(state.xpEvents.some((e) => e.key === `ref:${NEWBIE}:active`)).toBe(
      false,
    );

    state.progressMetrics.set(NEWBIE, { logged: 5 });
    await progress(NEWBIE);
    await progress(NEWBIE);
    expect(
      state.xpEvents.filter((e) => e.key === `ref:${NEWBIE}:active`),
    ).toHaveLength(1);
    expect(
      state.tokenEvents.find((e) => e.key === `ref:${NEWBIE}`),
    ).toMatchObject({
      user_id: USER_A,
      amount: 25,
    });
    expect(
      state.xpEvents.find(
        (e) => e.user_id === NEWBIE && e.key === "ref:welcome",
      ),
    ).toBeDefined();
  });
});

describe("the leaderboard", () => {
  it("ranks you among your friends only", async () => {
    const { app, xp } = setup();
    await xp(USER_B, "rate", "r1", 50);
    await xp(USER_A, "rate", "r2", 30);
    await xp(STRANGER, "rate", "r3", 500);

    const rows = (
      await request(app).get("/api/v1/me/leaderboard").set(as(USER_A))
    ).body;
    expect(
      rows.map((r: { username: string; rank: number }) => [r.username, r.rank]),
    ).toEqual([
      ["frienduser", 1],
      ["devuser", 2],
    ]);
    expect(rows[1].isYou).toBe(true);
  });
});

describe("the all-time board", () => {
  it("ranks by everything ever earned", async () => {
    const { app, xp, state } = setup();
    await xp(USER_A, "rate", "r1", 30);
    // Earned long ago: off this week's board, on the all-time one.
    state.xpEvents.push({
      id: 999,
      user_id: USER_B,
      source: "rate",
      key: "old",
      xp: 500,
      created_at: "2020-01-01T00:00:00.000Z",
    });
    state.profiles.find((p) => p.id === USER_B)!.xp = 500;

    const board = async (period: string) =>
      (
        await request(app)
          .get(`/api/v1/me/leaderboard?period=${period}`)
          .set(as(USER_A))
      ).body.map((r: { username: string }) => r.username);
    expect(await board("week")).toEqual(["devuser", "frienduser"]);
    expect(await board("all")).toEqual(["frienduser", "devuser"]);
  });
});

describe("the launch and the leaderboard", () => {
  it("leaves the badges a reveal hands out off this week's board", async () => {
    const { app, progress, state } = setup();
    state.profiles.find((p) => p.id === USER_A)!.revealed_at = null;
    state.progressMetrics.set(USER_A, { logged: 600 });
    await progress();

    const rows = (
      await request(app).get("/api/v1/me/leaderboard").set(as(USER_A))
    ).body;
    expect(rows.find((r: { isYou: boolean }) => r.isYou).xp).toBe(0);
  });
});

describe("badges in public", () => {
  it("shows a private profile's badges, and its progress only to its owner", async () => {
    const { app, progress, state } = setup({
      profiles: [buildProfile({ profile_visibility: "private" })],
    });
    state.progressMetrics.set(USER_A, { logged: 10 });
    await progress();

    const theirs = (await request(app).get("/api/v1/progress/devuser/badges"))
      .body;
    expect(theirs.held).toEqual([
      expect.objectContaining({ badge: "collector", metal: 1, rarity: 1 }),
    ]);
    expect(theirs.progress).toBeUndefined();
    const mine = (
      await request(app).get("/api/v1/progress/devuser/badges").set(as(USER_A))
    ).body;
    expect(mine.progress.length).toBeGreaterThan(10);
  });

  it("draws the player card", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 404 })),
    );
    const { app } = setup();
    const res = await request(app)
      .get("/api/v1/progress/devuser/card.png?theme=holo")
      .buffer(true);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("image/png");
  }, 20_000);
});

describe("account data", () => {
  it("goes in the export, and goes with the account", async () => {
    const { app, xp, tokens, state } = setup();
    await xp(USER_A, "rate", "rate:1");
    await tokens(USER_A, 10);

    const exported = await request(app)
      .get("/api/v1/profiles/me/export")
      .set(as(USER_A));
    expect(exported.body.xpEvents).toHaveLength(1);
    expect(exported.body.tokenEvents).toHaveLength(1);

    await request(app).delete("/api/v1/profiles/me").set(as(USER_A));
    expect(state.xpEvents).toEqual([]);
    expect(state.tokenEvents).toEqual([]);
  });
});
