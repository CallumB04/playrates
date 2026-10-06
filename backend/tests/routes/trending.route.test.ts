import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { buildTestApp } from "../helpers/buildTestApp.js";
import { baseSeed, buildGame } from "../helpers/fixtures.js";
import {
  nullGamesProvider,
  type GamesProvider,
} from "../../src/providers/games/GamesProvider.js";

const provider = (igdbIds: number[]): GamesProvider => ({
  ...nullGamesProvider,
  name: "stub",
  isConfigured: true,
  trendingIds: vi.fn(async () => igdbIds),
});

const seed = () => ({
  ...baseSeed(),
  games: [
    buildGame({ id: 1, title: "Old flag", igdb_id: 10, is_trending: true }),
    buildGame({ id: 2, title: "Second", igdb_id: 20, is_trending: false, log_count: 50 }),
    buildGame({ id: 3, title: "First", igdb_id: 30, is_trending: false }),
    buildGame({ id: 4, title: "Adult", igdb_id: 40, is_trending: false, has_sexual_content: true }),
  ],
  gamePlatforms: [],
});

const run = (app: Parameters<typeof request>[0], secret = "test-cron-secret") =>
  request(app)
    .get("/api/v1/cron/trending")
    .set("Authorization", `Bearer ${secret}`);

describe("trending from IGDB", () => {
  it("makes IGDB's trending games the trending set, in its order", async () => {
    // 99 isn't in the catalogue; 40 is adult.
    const { app, state } = buildTestApp({
      seed: seed(),
      provider: provider([30, 99, 40, 20]),
    });

    const response = await run(app);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ trending: 2 });
    expect(
      state.games.filter((g) => g.is_trending).map((g) => g.title),
    ).toEqual(["Second", "First"]);

    const rail = await request(app).get("/api/v1/games?trending=true&limit=12");
    // IGDB's order, not the logged one Second would win.
    expect(rail.body.data.slice(0, 2).map((g: { title: string }) => g.title)).toEqual([
      "First",
      "Second",
    ]);
  });

  it("keeps the set it has when IGDB names nothing in the catalogue", async () => {
    const { app, state } = buildTestApp({ seed: seed(), provider: provider([99]) });

    await run(app);

    expect(state.games.find((g) => g.id === 1)!.is_trending).toBe(true);
  });

  it("is not there without Vercel's secret", async () => {
    const { app } = buildTestApp({ seed: seed(), provider: provider([30]) });

    expect((await run(app, "wrong")).status).toBe(404);
    expect((await request(app).get("/api/v1/cron/trending")).status).toBe(404);
  });
});
