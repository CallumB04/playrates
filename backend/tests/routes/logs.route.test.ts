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
  buildGame,
  buildGameLog,
  buildReview,
} from "../helpers/fixtures.js";

/** Game 1 is on Steam and two consoles; game 2 lists none at all. */
const seed = () => ({
  ...baseSeed(),
  games: [
    buildGame(),
    buildGame({ id: 2, slug: "unlisted", title: "Unlisted" }),
  ],
  gameSystems: [
    { game_id: 1, system_slug: "steam" },
    { game_id: 1, system_slug: "playstation5" },
    { game_id: 1, system_slug: "switch" },
  ],
});

const as = (user: string) => ({ Authorization: authHeader(user) });

const post = (
  app: Parameters<typeof request>[0],
  body: object,
  user = USER_A,
) => request(app).post("/api/v1/me/logs").set(as(user)).send(body);

describe("a log per platform", () => {
  it("logs a game a second time on another console", async () => {
    const { app, state } = buildTestApp({ seed: seed() });

    const first = await post(app, {
      gameId: 1,
      status: "played",
      system: "steam",
    });
    const second = await post(app, {
      gameId: 1,
      status: "playing",
      system: "switch",
    });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.id).not.toBe(first.body.id);
    expect(state.gameLogs).toHaveLength(2);
  });

  it("refuses a console that is already logged, with a code to show by it", async () => {
    const { app } = buildTestApp({
      seed: { ...seed(), gameLogs: [buildGameLog({ system_slug: "steam" })] },
    });

    const response = await post(app, {
      gameId: 1,
      status: "played",
      system: "steam",
    });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("platform_taken");
  });

  /* Two logs without a console could never be told apart. */
  it("allows one log without a console, not two", async () => {
    const { app } = buildTestApp({
      seed: { ...seed(), gameLogs: [buildGameLog({ system_slug: null })] },
    });

    const response = await post(app, { gameId: 1, status: "backlog" });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("platform_taken");
  });

  it("refuses a console the game isn't on", async () => {
    const { app } = buildTestApp({ seed: seed() });

    const response = await post(app, {
      gameId: 1,
      status: "played",
      system: "xboxseriesx",
    });

    expect(response.status).toBe(422);
  });

  it("takes any console for a game that lists none", async () => {
    const { app } = buildTestApp({ seed: seed() });

    const response = await post(app, {
      gameId: 2,
      status: "played",
      system: "xboxseriesx",
    });

    expect(response.status).toBe(201);
  });

  /* The catalogue can drop a console after a log names it. */
  it("still saves a log whose console the catalogue no longer lists", async () => {
    const { app } = buildTestApp({
      seed: {
        ...seed(),
        gameLogs: [buildGameLog({ id: 1, system_slug: "xboxone" })],
      },
    });

    const response = await request(app)
      .put("/api/v1/me/logs/1")
      .set(as(USER_A))
      .send({ status: "played", rating: 7, system: "xboxone" });

    expect(response.status).toBe(200);
    expect(response.body.rating).toBe(7);
  });

  it("refuses to move a log onto a console already logged", async () => {
    const { app } = buildTestApp({
      seed: {
        ...seed(),
        gameLogs: [
          buildGameLog({ id: 1, system_slug: "steam" }),
          buildGameLog({ id: 2, system_slug: "switch" }),
        ],
      },
    });

    const response = await request(app)
      .put("/api/v1/me/logs/2")
      .set(as(USER_A))
      .send({ status: "played", system: "steam" });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("platform_taken");
  });

  it("deletes one console's log and its review, and leaves the other", async () => {
    const { app, state } = buildTestApp({
      seed: {
        ...seed(),
        gameLogs: [
          buildGameLog({ id: 1, system_slug: "steam" }),
          buildGameLog({ id: 2, system_slug: "switch" }),
        ],
        reviews: [
          buildReview({ id: 1, log_id: 1 }),
          buildReview({ id: 2, log_id: 2 }),
        ],
      },
    });

    const response = await request(app)
      .delete("/api/v1/me/logs/2")
      .set(as(USER_A));

    expect(response.status).toBe(204);
    expect(state.gameLogs.map((l) => l.id)).toEqual([1]);
    expect(state.reviews.map((r) => r.id)).toEqual([1]);
  });

  it("treats someone else's log as one that doesn't exist", async () => {
    const { app } = buildTestApp({
      seed: { ...seed(), gameLogs: [buildGameLog({ id: 1, user_id: USER_B })] },
    });

    const edit = await request(app)
      .put("/api/v1/me/logs/1")
      .set(as(USER_A))
      .send({ status: "played" });
    const review = await request(app)
      .put("/api/v1/me/logs/1/review")
      .set(as(USER_A))
      .send({ body: "Not mine to review." });

    expect(edit.status).toBe(404);
    expect(review.status).toBe(404);
  });
});

describe("a review per platform", () => {
  it("keeps a review on each console's log", async () => {
    const { app } = buildTestApp({
      seed: {
        ...seed(),
        gameLogs: [
          buildGameLog({ id: 1, system_slug: "steam", rating: 9 }),
          buildGameLog({ id: 2, system_slug: "switch", rating: 6 }),
        ],
      },
    });

    for (const [logId, body] of [
      [1, "Smooth at 120fps."],
      [2, "The port struggles in the city."],
    ] as const) {
      const response = await request(app)
        .put(`/api/v1/me/logs/${logId}/review`)
        .set(as(USER_A))
        .send({ body });
      expect(response.status).toBe(201);
      expect(response.body.logId).toBe(logId);
    }

    const listed = await request(app).get("/api/v1/games/1/reviews");
    const reviews = listed.body.data as {
      system: string;
      rating: number;
    }[];
    expect(reviews.map((r) => [r.system, r.rating]).sort()).toEqual([
      ["steam", 9],
      ["switch", 6],
    ]);
  });
});

describe("my logs of a game", () => {
  it("bundles every console's log with its review and the totals", async () => {
    const { app } = buildTestApp({
      seed: {
        ...seed(),
        gameLogs: [
          buildGameLog({
            id: 1,
            system_slug: "steam",
            rating: 9,
            hours_played: 40,
            hours_to_beat: 30,
          }),
          buildGameLog({
            id: 2,
            system_slug: "switch",
            status: "playing",
            played_status: null,
            rating: 7,
            hours_played: 10,
            hours_to_beat: null,
          }),
        ],
        reviews: [buildReview({ id: 1, log_id: 1 })],
      },
    });

    const response = await request(app)
      .get("/api/v1/me/logs?gameId=1")
      .set(as(USER_A));

    expect(response.status).toBe(200);
    expect(response.body.logs.map((l: { id: number }) => l.id)).toEqual([1, 2]);
    expect(response.body.logs[0].review.id).toBe(1);
    expect(response.body.logs[1].review).toBeNull();
    expect(response.body.rollup).toMatchObject({
      logCount: 2,
      status: "playing",
      rating: 8,
      hoursPlayed: 50,
      quickestBeat: { hours: 30, logId: 1, system: "steam" },
    });
  });

  it("is an empty bundle, not a 404, for a game not logged", async () => {
    const { app } = buildTestApp({ seed: seed() });

    const response = await request(app)
      .get("/api/v1/me/logs?gameId=1")
      .set(as(USER_A));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ gameId: 1, logs: [], rollup: null });
  });

  it("hides someone's private review from everyone else", async () => {
    const { app } = buildTestApp({
      seed: {
        ...seed(),
        gameLogs: [buildGameLog({ id: 1 })],
        reviews: [buildReview({ id: 1, log_id: 1, is_public: false })],
      },
    });

    const theirs = await request(app)
      .get("/api/v1/users/devuser/logs?gameId=1")
      .set(as(USER_B));
    const mine = await request(app)
      .get("/api/v1/users/devuser/logs?gameId=1")
      .set(as(USER_A));

    expect(theirs.body.logs[0].review).toBeNull();
    expect(mine.body.logs[0].review.id).toBe(1);
  });
});

describe("shelves of games", () => {
  const shelfSeed = () => ({
    ...seed(),
    games: [buildGame(), buildGame({ id: 2, slug: "second", title: "Second" })],
    gameLogs: [
      buildGameLog({ id: 1, game_id: 1, system_slug: "steam", rating: 9 }),
      buildGameLog({
        id: 2,
        game_id: 1,
        system_slug: "switch",
        status: "backlog",
        played_status: null,
        rating: 5,
      }),
      buildGameLog({ id: 3, game_id: 2, system_slug: "steam", rating: 8 }),
    ],
  });

  it("lists each game once, with all its logs", async () => {
    const { app } = buildTestApp({ seed: shelfSeed() });

    const response = await request(app).get("/api/v1/me/shelf").set(as(USER_A));

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);
    const first = response.body.data.find(
      (e: { gameId: number }) => e.gameId === 1,
    );
    expect(first.logs).toHaveLength(2);
    expect(first.rollup.systems).toEqual(["steam", "switch"]);
  });

  it("puts a game on every shelf one of its logs is on", async () => {
    const { app } = buildTestApp({ seed: shelfSeed() });

    const played = await request(app)
      .get("/api/v1/users/devuser/shelf?status=played")
      .set(as(USER_B));
    const backlog = await request(app)
      .get("/api/v1/users/devuser/shelf?status=backlog")
      .set(as(USER_B));

    expect(
      played.body.data.map((e: { gameId: number }) => e.gameId).sort(),
    ).toEqual([1, 2]);
    expect(backlog.body.data.map((e: { gameId: number }) => e.gameId)).toEqual([
      1,
    ]);
  });

  it("sorts by the mean of a game's ratings", async () => {
    const { app } = buildTestApp({ seed: shelfSeed() });

    const response = await request(app)
      .get("/api/v1/me/shelf?sort=rating&direction=desc")
      .set(as(USER_A));

    // game 2 is an 8; game 1 averages 9 and 5 to a 7
    expect(response.body.data.map((e: { gameId: number }) => e.gameId)).toEqual(
      [2, 1],
    );
  });

  /* The tab counts and the shelf's pages have to agree. */
  it("counts games per shelf the way the shelves list them", async () => {
    const { app } = buildTestApp({ seed: shelfSeed() });

    const stats = await request(app).get("/api/v1/users/devuser/stats");
    const played = await request(app).get(
      "/api/v1/users/devuser/shelf?status=played",
    );

    expect(stats.body).toMatchObject({
      logCount: 3,
      gameCount: 2,
      byStatus: { played: 2, backlog: 1 },
      averageRating: 7.5,
      ratingCount: 2,
    });
    expect(played.body.meta.total).toBe(stats.body.byStatus.played);
  });

  it("groups the 'have I logged this' list by game", async () => {
    const { app } = buildTestApp({ seed: shelfSeed() });

    const response = await request(app)
      .get("/api/v1/me/game-logs/ids")
      .set(as(USER_A));

    const first = response.body.data.find(
      (s: { gameId: number }) => s.gameId === 1,
    );
    expect(response.body.data).toHaveLength(2);
    expect(first).toMatchObject({ status: "played", rating: 7 });
    expect(first.logs.map((l: { system: string }) => l.system)).toEqual([
      "steam",
      "switch",
    ]);
  });
});

/* Tabs left open across the deploy still address logs by game. */
describe("game-addressed routes, with a log per platform", () => {
  const twoLogs = () => ({
    ...seed(),
    gameLogs: [
      buildGameLog({
        id: 1,
        system_slug: "steam",
        status: "backlog",
        played_status: null,
      }),
      buildGameLog({
        id: 2,
        system_slug: "switch",
        status: "playing",
        played_status: null,
      }),
    ],
  });

  it("reads the log that speaks for the game", async () => {
    const { app } = buildTestApp({ seed: twoLogs() });

    const response = await request(app)
      .get("/api/v1/me/game-logs/1")
      .set(as(USER_A));

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(2);
  });

  it("edits the log whose console the write names", async () => {
    const { app, state } = buildTestApp({ seed: twoLogs() });

    const response = await request(app)
      .put("/api/v1/me/game-logs/1")
      .set(as(USER_A))
      .send({ status: "played", system: "steam", rating: 6 });

    expect(response.status).toBe(200);
    expect(state.gameLogs.find((l) => l.id === 1)?.rating).toBe(6);
    expect(state.gameLogs.find((l) => l.id === 2)?.status).toBe("playing");
  });

  /* Guessing would overwrite the other console's log. */
  it("won't guess which log a write means", async () => {
    const { app, state } = buildTestApp({ seed: twoLogs() });

    const write = await request(app)
      .put("/api/v1/me/game-logs/1")
      .set(as(USER_A))
      .send({ status: "played" });
    const remove = await request(app)
      .delete("/api/v1/me/game-logs/1")
      .set(as(USER_A));

    expect(write.status).toBe(409);
    expect(write.body.error.code).toBe("several_logs");
    expect(remove.status).toBe(409);
    expect(state.gameLogs).toHaveLength(2);
  });
});
