import { describe, expect, it } from "vitest";
import request from "supertest";
import {
  authHeader,
  buildTestApp,
  USER_A,
  USER_B,
} from "../helpers/buildTestApp.js";
import { baseSeed, buildGame, buildGameLog } from "../helpers/fixtures.js";

const validLog = {
  status: "played",
  playedStatus: "finished",
  rating: 8.5,
  platform: "steam",
};

describe("game logs", () => {
  it("creates a log and returns 201", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app)
      .put("/api/v1/me/game-logs/1")
      .set("Authorization", authHeader(USER_A))
      .send(validLog);

    expect(response.status).toBe(201);
    expect(response.body.gameId).toBe(1);
    expect(response.body.rating).toBe(8.5);
  });

  /**
   * `id` and `gameId` are both numbers and easy to confuse, so this pins
   * which is which.
   */
  it("returns the log id in `id` and the game id in `gameId`", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app)
      .put("/api/v1/me/game-logs/1")
      .set("Authorization", authHeader(USER_A))
      .send(validLog);

    expect(response.body.gameId).toBe(1);
    expect(response.body.id).not.toBe(response.body.gameId);
  });

  it("upserts rather than duplicating on a repeat write", async () => {
    const { app, state } = buildTestApp({ seed: baseSeed() });

    await request(app)
      .put("/api/v1/me/game-logs/1")
      .set("Authorization", authHeader(USER_A))
      .send(validLog);

    const second = await request(app)
      .put("/api/v1/me/game-logs/1")
      .set("Authorization", authHeader(USER_A))
      .send({ ...validLog, rating: 10 });

    expect(second.status).toBe(200);
    expect(state.gameLogs).toHaveLength(1);
    expect(Number(state.gameLogs[0]!.rating)).toBe(10);
  });

  it("clears playedStatus when the status is not 'played'", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app)
      .put("/api/v1/me/game-logs/1")
      .set("Authorization", authHeader(USER_A))
      .send({ status: "wishlist", playedStatus: "finished" });

    expect(response.status).toBe(201);
    expect(response.body.playedStatus).toBeNull();
  });

  it("rejects a rating that is not a multiple of 0.25", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app)
      .put("/api/v1/me/game-logs/1")
      .set("Authorization", authHeader(USER_A))
      .send({ status: "played", rating: 6.3 });

    expect(response.status).toBe(422);
    expect(response.body.error.details).toHaveProperty("rating");
  });

  it("rejects completed achievements above the total", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app)
      .put("/api/v1/me/game-logs/1")
      .set("Authorization", authHeader(USER_A))
      .send({
        status: "played",
        achievementsTotal: 10,
        achievementsCompleted: 11,
      });

    expect(response.status).toBe(422);
  });

  it("rejects a finish date before the start date", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app)
      .put("/api/v1/me/game-logs/1")
      .set("Authorization", authHeader(USER_A))
      .send({
        status: "played",
        startDate: "2024-05-10",
        finishDate: "2024-05-01",
      });

    expect(response.status).toBe(422);
  });

  it("returns 404 when logging a game that does not exist", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app)
      .put("/api/v1/me/game-logs/999")
      .set("Authorization", authHeader(USER_A))
      .send(validLog);

    expect(response.status).toBe(404);
  });

  it("embeds the game in list responses", async () => {
    const { app } = buildTestApp({
      seed: { ...baseSeed(), gameLogs: [buildGameLog()] },
    });

    const response = await request(app)
      .get("/api/v1/me/game-logs")
      .set("Authorization", authHeader(USER_A));

    expect(response.status).toBe(200);
    expect(response.body.data[0].game.title).toBe("The Witcher 3: Wild Hunt");
    expect(response.body.data[0].game.platforms).toEqual(["steam"]);
  });

  it("deletes with a 204 and an empty body", async () => {
    const { app, state } = buildTestApp({
      seed: { ...baseSeed(), gameLogs: [buildGameLog()] },
    });

    const response = await request(app)
      .delete("/api/v1/me/game-logs/1")
      .set("Authorization", authHeader(USER_A));

    // a body sent with a 204 is silently dropped, so assert it is empty
    expect(response.status).toBe(204);
    expect(response.text).toBe("");
    expect(state.gameLogs).toHaveLength(0);
  });

  /** Someone else's log should not be distinguishable from a missing one. */
  it("returns 404 when editing a log belonging to another user", async () => {
    const { app, state } = buildTestApp({
      seed: { ...baseSeed(), gameLogs: [buildGameLog({ user_id: USER_B })] },
    });

    const response = await request(app)
      .patch("/api/v1/me/game-logs/1")
      .set("Authorization", authHeader(USER_A))
      .send({ rating: 1 });

    expect(response.status).toBe(404);
    expect(Number(state.gameLogs[0]!.rating)).toBe(9.25);
  });

  it("returns 404 when deleting another user's log", async () => {
    const { app, state } = buildTestApp({
      seed: { ...baseSeed(), gameLogs: [buildGameLog({ user_id: USER_B })] },
    });

    const response = await request(app)
      .delete("/api/v1/me/game-logs/1")
      .set("Authorization", authHeader(USER_A));

    expect(response.status).toBe(404);
    expect(state.gameLogs).toHaveLength(1);
  });

  it("lists another user's logs by username without auth", async () => {
    const { app } = buildTestApp({
      seed: { ...baseSeed(), gameLogs: [buildGameLog()] },
    });

    const response = await request(app).get("/api/v1/users/devuser/game-logs");

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
  });

  it("filters by status", async () => {
    const { app } = buildTestApp({
      seed: {
        ...baseSeed(),
        gameLogs: [
          buildGameLog(),
          buildGameLog({ id: 2, game_id: 1, status: "backlog" }),
        ],
      },
    });

    const response = await request(app)
      .get("/api/v1/me/game-logs?status=backlog")
      .set("Authorization", authHeader(USER_A));

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].status).toBe("backlog");
  });

  describe("ordering a shelf", () => {
    /* Three games and three logs, each field deliberately disagreeing with
       the others so every sort has a distinct right answer. */
    const seed = () => ({
      ...baseSeed(),
      games: [
        buildGame({
          id: 1,
          title: "Alpha",
          release_date: "2020-01-01",
          metacritic: 70,
        }),
        buildGame({
          id: 2,
          slug: "beta",
          title: "Beta",
          release_date: "2010-01-01",
          avg_rating: 9,
          metacritic: 95,
        }),
        buildGame({
          id: 3,
          slug: "gamma",
          title: "Gamma",
          release_date: "2015-01-01",
          avg_rating: 4,
          metacritic: 60,
        }),
      ],
      gameLogs: [
        buildGameLog({
          id: 1,
          game_id: 1,
          rating: 5,
          start_date: "2019-01-01",
          // Edited yesterday, played years ago.
          updated_at: "2026-09-01T00:00:00.000Z",
          achievements_total: 10,
          achievements_completed: 1,
        }),
        buildGameLog({
          id: 2,
          game_id: 2,
          rating: 9,
          start_date: "2021-01-01",
          finish_date: "2021-06-01",
          updated_at: "2026-01-01T00:00:00.000Z",
          achievements_total: 10,
          achievements_completed: 9,
        }),
        buildGameLog({
          id: 3,
          game_id: 3,
          rating: 7,
          start_date: "2020-05-01",
          updated_at: "2026-02-01T00:00:00.000Z",
        }),
      ],
    });

    const titles = async (query: string) => {
      const { app } = buildTestApp({ seed: seed() });
      const response = await request(app)
        .get(`/api/v1/me/game-logs?${query}`)
        .set("Authorization", authHeader(USER_A));
      expect(response.status).toBe(200);
      return response.body.data.map(
        (log: { game: { title: string } | null }) => log.game?.title,
      );
    };

    it("orders by the caller's own rating, highest first, by default", async () => {
      expect(await titles("")).toEqual(["Beta", "Gamma", "Alpha"]);
    });

    it("turns any sort around", async () => {
      expect(await titles("sort=rating&direction=asc")).toEqual([
        "Alpha",
        "Gamma",
        "Beta",
      ]);
    });

    it("orders by the game's average rather than the caller's", async () => {
      expect(await titles("sort=gameRating&direction=desc")).toEqual([
        "Beta",
        "Gamma",
        "Alpha",
      ]);
    });

    /* Off the dates on the log, not the row's timestamp — Alpha was edited
       most recently of the three and was played first of the three. */
    it("orders by when the game was played, not when the row was written", async () => {
      expect(await titles("sort=played&direction=desc")).toEqual([
        "Beta",
        "Gamma",
        "Alpha",
      ]);
    });

    it("orders by the critic score", async () => {
      expect(await titles("sort=metacritic&direction=desc")).toEqual([
        "Beta",
        "Alpha",
        "Gamma",
      ]);
    });

    it("orders by title", async () => {
      expect(await titles("sort=title&direction=asc")).toEqual([
        "Alpha",
        "Beta",
        "Gamma",
      ]);
    });

    it("orders by release date", async () => {
      expect(await titles("sort=released&direction=asc")).toEqual([
        "Beta",
        "Gamma",
        "Alpha",
      ]);
    });

    it("orders by achievement completion", async () => {
      expect(await titles("sort=completion&direction=desc")).toEqual([
        "Beta",
        "Alpha",
        "Gamma",
      ]);
    });

    /* A shelf sorted by something half of it has no value for should not put
       the blanks first just because the arrow was flipped. */
    it("leaves logs with nothing to sort on at the end either way", async () => {
      const ascending = await titles("sort=completion&direction=asc");
      expect(ascending).toEqual(["Alpha", "Beta", "Gamma"]);
      expect(ascending.at(-1)).toBe("Gamma");
    });

    it("refuses a sort it does not have", async () => {
      const { app } = buildTestApp({ seed: seed() });
      const response = await request(app)
        .get("/api/v1/me/game-logs?sort=hours")
        .set("Authorization", authHeader(USER_A));
      expect(response.status).toBe(422);
    });
  });

  describe("filtering a played shelf by how it ended", () => {
    const seed = () => ({
      ...baseSeed(),
      games: [
        buildGame({ id: 1, title: "Alpha" }),
        buildGame({ id: 2, slug: "beta", title: "Beta" }),
        buildGame({ id: 3, slug: "gamma", title: "Gamma" }),
      ],
      gameLogs: [
        buildGameLog({ id: 1, game_id: 1, played_status: "mastered" }),
        buildGameLog({ id: 2, game_id: 2, played_status: "shelved" }),
        // Played, with no further detail.
        buildGameLog({ id: 3, game_id: 3, played_status: null }),
      ],
    });

    const titles = async (query: string) => {
      const { app } = buildTestApp({ seed: seed() });
      const response = await request(app)
        .get(`/api/v1/me/game-logs?${query}`)
        .set("Authorization", authHeader(USER_A));
      expect(response.status).toBe(200);
      return response.body.data.map(
        (log: { game: { title: string } | null }) => log.game?.title,
      );
    };

    it("returns every played log when no ending is asked for", async () => {
      expect((await titles("status=played")).sort()).toEqual([
        "Alpha",
        "Beta",
        "Gamma",
      ]);
    });

    it("narrows to one ending", async () => {
      expect(await titles("status=played&playedStatus=mastered")).toEqual([
        "Alpha",
      ]);
    });

    /* "No substatus" is a state of its own — filtering for it must not fall
       through to returning everything. */
    it("finds the logs carrying no ending at all", async () => {
      expect(await titles("status=played&playedStatus=none")).toEqual([
        "Gamma",
      ]);
    });

    it("refuses an ending that is not one", async () => {
      const { app } = buildTestApp({ seed: seed() });
      const response = await request(app)
        .get("/api/v1/me/game-logs?playedStatus=abandoned")
        .set("Authorization", authHeader(USER_A));
      expect(response.status).toBe(422);
    });
  });
});
