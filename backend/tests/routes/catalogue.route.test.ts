import { describe, expect, it } from "vitest";
import request from "supertest";
import {
  authHeader,
  buildTestApp,
  USER_A,
  USER_B,
} from "../helpers/buildTestApp.js";
import { baseSeed, buildGame, buildGameLog } from "../helpers/fixtures.js";

describe("genres", () => {
  it("lists genres with display names, which games only carry as slugs", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app).get("/api/v1/genres");

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([
      { slug: "action", name: "Action" },
      { slug: "indie", name: "Indie" },
    ]);
  });

  it("does not require authentication", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });
    expect((await request(app).get("/api/v1/genres")).status).toBe(200);
  });
});

describe("catalogue ordering", () => {
  const seedWithSorts = () => ({
    ...baseSeed(),
    games: [
      buildGame({
        id: 1,
        title: "Zebra",
        release_date: "2020-01-01",
        rawg_added_count: 500,
      }),
      buildGame({
        id: 2,
        title: "Apple",
        release_date: "2024-06-01",
        rawg_added_count: 900,
      }),
      buildGame({
        id: 3,
        title: "Mango",
        release_date: "2022-03-01",
        rawg_added_count: null,
      }),
    ],
    gamePlatforms: [],
  });

  it("defaults to most-tracked rather than alphabetical", async () => {
    const { app } = buildTestApp({ seed: seedWithSorts() });

    const response = await request(app).get("/api/v1/games");

    expect(response.status).toBe(200);
    expect(response.body.data.map((g: { title: string }) => g.title)).toEqual([
      "Apple",
      "Zebra",
      "Mango",
    ]);
  });

  it("sorts by title, release date and rating on request", async () => {
    const { app } = buildTestApp({ seed: seedWithSorts() });
    const titles = async (sort: string) =>
      (await request(app).get(`/api/v1/games?sort=${sort}`)).body.data.map(
        (g: { title: string }) => g.title,
      );

    expect(await titles("title")).toEqual(["Apple", "Mango", "Zebra"]);
    expect(await titles("released")).toEqual(["Apple", "Mango", "Zebra"]);
  });

  it("rejects a sort it does not know", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });
    const response = await request(app).get("/api/v1/games?sort=vibes");
    expect(response.status).toBe(422);
  });

  it("pages without repeating or dropping rows when the sort key ties", async () => {
    // Every row shares a sort key, so only the id tiebreaker keeps paging
    // stable. Without it Postgres may return the same row on two pages.
    const { app } = buildTestApp({
      seed: {
        ...baseSeed(),
        games: Array.from({ length: 10 }, (_, i) =>
          buildGame({
            id: i + 1,
            title: "Same Title",
            rawg_added_count: 100,
          }),
        ),
        gamePlatforms: [],
      },
    });

    const pageOf = async (page: number) =>
      (await request(app).get(`/api/v1/games?limit=4&page=${page}`)).body.data.map(
        (g: { id: number }) => g.id,
      );

    const seen = [...(await pageOf(1)), ...(await pageOf(2)), ...(await pageOf(3))];
    expect(seen).toHaveLength(10);
    expect(new Set(seen).size).toBe(10);
  });

  it("filters to a release window", async () => {
    const { app } = buildTestApp({ seed: seedWithSorts() });

    const response = await request(app).get(
      "/api/v1/games?releasedAfter=2021-01-01&releasedBefore=2023-01-01",
    );

    expect(response.body.data.map((g: { title: string }) => g.title)).toEqual([
      "Mango",
    ]);
  });
});

describe("my game-log summaries", () => {
  it("returns every log, so 'have I logged this' stays right past page one", async () => {
    const { app } = buildTestApp({
      seed: {
        ...baseSeed(),
        gameLogs: [
          buildGameLog({
            id: 1,
            game_id: 1,
            status: "played",
            played_status: "mastered",
            rating: 9,
          }),
        ],
      },
    });

    const response = await request(app)
      .get("/api/v1/me/game-logs/ids")
      .set("Authorization", authHeader(USER_A));

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([
      { gameId: 1, status: "played", playedStatus: "mastered", rating: 9 },
    ]);
  });

  it("is not mistaken for a game id", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app)
      .get("/api/v1/me/game-logs/ids")
      .set("Authorization", authHeader(USER_A));

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
  });

  it("requires authentication", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });
    expect((await request(app).get("/api/v1/me/game-logs/ids")).status).toBe(401);
  });
});

describe("user stats", () => {
  const seedWithLogs = () => ({
    ...baseSeed(),
    games: [buildGame({ id: 1 }), buildGame({ id: 2, slug: "b", rawg_id: 2 })],
    gameLogs: [
      buildGameLog({ id: 1, game_id: 1, status: "played", hours_played: 52.5, rating: 9 }),
      buildGameLog({ id: 2, game_id: 2, status: "backlog", hours_played: null, rating: null }),
    ],
  });

  it("totals hours across the whole shelf, which a paged list cannot", async () => {
    const { app } = buildTestApp({ seed: seedWithLogs() });

    const response = await request(app).get("/api/v1/users/devuser/stats");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      logCount: 2,
      hoursPlayed: 52.5,
      averageRating: 9,
      ratingCount: 1,
    });
    expect(response.body.byStatus).toMatchObject({ played: 1, backlog: 1 });
  });

  it("404s for an unknown user rather than returning empty stats", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });
    expect((await request(app).get("/api/v1/users/nobody/stats")).status).toBe(404);
  });

  it("rejects a nonsense year", async () => {
    const { app } = buildTestApp({ seed: seedWithLogs() });
    const response = await request(app).get("/api/v1/users/devuser/stats?year=abc");
    expect(response.status).toBe(422);
  });
});

describe("rating buckets", () => {
  it("returns a distribution, not just a mean", async () => {
    const { app } = buildTestApp({
      seed: {
        ...baseSeed(),
        gameLogs: [
          buildGameLog({ id: 1, game_id: 1, rating: 9 }),
          buildGameLog({ id: 2, game_id: 1, user_id: "b", rating: 9.5 }),
          buildGameLog({ id: 3, game_id: 1, user_id: "c", rating: 4 }),
          // 10.0 belongs in the top bucket, not an eleventh
          buildGameLog({ id: 4, game_id: 1, user_id: "d", rating: 10 }),
        ],
      },
    });

    const response = await request(app).get("/api/v1/games/1/stats");

    expect(response.status).toBe(200);
        // 20 buckets of 0.5, which is what the distribution plate draws.
        expect(response.body.ratingBuckets).toHaveLength(20);
        expect(response.body.ratingBuckets[18]).toBe(1); // 9.0
        expect(response.body.ratingBuckets[19]).toBe(2); // 9.5 and 10.0
        expect(response.body.ratingBuckets[8]).toBe(1); // 4.0
  });

    /* A log with no achievement data is not a player who failed to complete
       them, so it must not drag the mean toward zero. */
    it("averages completion over logs that track it, ignoring those that don't", async () => {
        const { app } = buildTestApp({
            seed: {
                ...baseSeed(),
                gameLogs: [
                    buildGameLog({
                        id: 1,
                        achievements_completed: 10,
                        achievements_total: 20,
                    }),
                    buildGameLog({
                        id: 2,
                        user_id: USER_B,
                        achievements_completed: null,
                        achievements_total: null,
                    }),
                ],
            },
        });

        const response = await request(app).get("/api/v1/games/1/stats");

        expect(response.body.avgCompletion).toBeCloseTo(0.5);
    });

    /* achievements_completed has no constraint tying it to the total, so one
       bad row could otherwise push the average past 100%. */
    it("clamps a log that claims more achievements than exist", async () => {
        const { app } = buildTestApp({
            seed: {
                ...baseSeed(),
                gameLogs: [
                    buildGameLog({
                        id: 1,
                        achievements_completed: 500,
                        achievements_total: 20,
                    }),
                ],
            },
        });

        const response = await request(app).get("/api/v1/games/1/stats");

        expect(response.body.avgCompletion).toBe(1);
    });
});

describe("most-logged sort", () => {
    it("orders by PlayRates logs, not by RAWG's tracker count", async () => {
        // Deliberately opposed: the least-tracked game has the most logs.
        const { app } = buildTestApp({
            seed: {
                ...baseSeed(),
                games: [
                    buildGame({ id: 1, title: "Tracked", rawg_added_count: 9000, log_count: 1 }),
                    buildGame({ id: 2, title: "Logged", rawg_added_count: 10, log_count: 40 }),
                ],
                gamePlatforms: [],
            },
        });

        const logged = await request(app).get("/api/v1/games?sort=logged");

        expect(logged.body.data.map((g: { title: string }) => g.title)).toEqual([
            "Logged",
            "Tracked",
        ]);
    });

    /* RAWG's tracker count orders everything with no logs yet, which is
       almost the whole library. It is not a sort anyone can ask for. */
    it("falls back to the tracker count only where logs tie", async () => {
        const { app } = buildTestApp({
            seed: {
                ...baseSeed(),
                games: [
                    buildGame({ id: 1, title: "Quiet", rawg_added_count: 10, log_count: 0 }),
                    buildGame({ id: 2, title: "Known", rawg_added_count: 9000, log_count: 0 }),
                    buildGame({ id: 3, title: "Logged", rawg_added_count: 1, log_count: 5 }),
                ],
                gamePlatforms: [],
            },
        });

        const response = await request(app).get("/api/v1/games?sort=logged");

        expect(response.body.data.map((g: { title: string }) => g.title)).toEqual([
            "Logged",
            "Known",
            "Quiet",
        ]);
    });

    it("rejects the old RAWG sort rather than quietly serving it", async () => {
        const { app } = buildTestApp({ seed: baseSeed() });
        const response = await request(app).get("/api/v1/games?sort=popular");
        expect(response.status).toBe(422);
    });

    it("sorts by Metacritic, with unscored games last", async () => {
        const { app } = buildTestApp({
            seed: {
                ...baseSeed(),
                games: [
                    buildGame({ id: 1, title: "Unscored", metacritic: null }),
                    buildGame({ id: 2, title: "Good", metacritic: 78 }),
                    buildGame({ id: 3, title: "Great", metacritic: 95 }),
                ],
                gamePlatforms: [],
            },
        });

        const response = await request(app).get("/api/v1/games?sort=metacritic");

        expect(response.body.data.map((g: { title: string }) => g.title)).toEqual([
            "Great",
            "Good",
            "Unscored",
        ]);
    });

    it("still pages stably when every log_count ties at zero", async () => {
        const { app } = buildTestApp({
            seed: {
                ...baseSeed(),
                games: Array.from({ length: 9 }, (_, i) =>
                    buildGame({ id: i + 1, title: `Game ${i}`, log_count: 0 }),
                ),
                gamePlatforms: [],
            },
        });

        const page = async (n: number) =>
            (await request(app).get(`/api/v1/games?sort=logged&limit=3&page=${n}`)).body
                .data.map((g: { id: number }) => g.id);

        const seen = [...(await page(1)), ...(await page(2)), ...(await page(3))];
        expect(new Set(seen).size).toBe(9);
    });
});
