import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { authHeader, buildTestApp, USER_A } from "../helpers/buildTestApp.js";
import {
  baseSeed,
  buildExternalGame,
  buildGame,
  buildGameLog,
} from "../helpers/fixtures.js";
import {
  nullGamesProvider,
  type GamesProvider,
} from "../../src/providers/games/GamesProvider.js";
import {
  parseSteamProfile,
  type SteamClient,
} from "../../src/providers/steam.js";

/** Three Steam games: 10 is here already, 20 is on IGDB and not yet here,
 *  30 IGDB doesn't know. */
const steam = (
  games: Awaited<ReturnType<SteamClient["ownedGames"]>> = [
    {
      appid: 10,
      name: "Hades",
      playtime: 1500,
      recentPlaytime: 0,
      hasStats: true,
    },
    {
      appid: 20,
      name: "Celeste",
      playtime: 0,
      recentPlaytime: 0,
      hasStats: true,
    },
    {
      appid: 30,
      name: "Some Tool",
      playtime: 90,
      recentPlaytime: 0,
      hasStats: false,
    },
  ],
  achievements: SteamClient["achievements"] = vi.fn(async (_id, appid) =>
    appid === 10 ? { total: 49, unlocked: 31 } : null,
  ),
): SteamClient => ({
  resolveVanity: vi.fn(async (name: string) =>
    name === "callum" ? "76561198000000001" : null,
  ),
  ownedGames: vi.fn(async () => games),
  achievements,
});

const provider: GamesProvider = {
  ...nullGamesProvider,
  isConfigured: true,
  fromSteam: vi.fn(
    async () =>
      new Map([
        [10, 1000],
        [20, 2000],
      ]),
  ),
  getByIds: vi.fn(async (ids: number[]) =>
    ids.map((id) => buildExternalGame(id, "Celeste")),
  ),
};

const seed = () => ({
  ...baseSeed(),
  games: [buildGame({ id: 1, title: "Hades", igdb_id: 1000 })],
});

const as = (app: Express) => ({
  get: (path: string) =>
    request(app).get(path).set("Authorization", authHeader(USER_A)),
  post: (path: string, body: object) =>
    request(app).post(path).set("Authorization", authHeader(USER_A)).send(body),
});

describe("reading a Steam profile", () => {
  it.each([
    ["76561198000000001", { kind: "id", id: "76561198000000001" }],
    [
      "https://steamcommunity.com/profiles/76561198000000001/",
      { kind: "id", id: "76561198000000001" },
    ],
    ["steamcommunity.com/id/callum", { kind: "vanity", name: "callum" }],
    ["callum", { kind: "vanity", name: "callum" }],
  ])("reads %s", (input, ref) => {
    expect(parseSteamProfile(input)).toEqual(ref);
  });

  it.each(["https://example.com/id/callum", "a", "has spaces in it"])(
    "refuses %s",
    (input) => {
      expect(parseSteamProfile(input)).toBeNull();
    },
  );
});

describe("Steam import", () => {
  it("isn't offered without a Steam key", async () => {
    const { app } = buildTestApp({ seed: seed(), provider });
    expect((await as(app).get("/api/v1/me/steam")).body).toEqual({
      available: false,
    });
    expect(
      (await as(app).post("/api/v1/me/steam/preview", { profile: "callum" }))
        .status,
    ).toBe(404);
  });

  it("matches the library, bringing in what IGDB knows and we don't", async () => {
    const { app, state } = buildTestApp({
      seed: seed(),
      provider,
      steam: steam(),
    });

    const response = await as(app).post("/api/v1/me/steam/preview", {
      profile: "https://steamcommunity.com/id/callum",
    });

    expect(response.status).toBe(200);
    const celeste = state.games.find((g) => g.igdb_id === 2000)!;
    expect(response.body).toEqual({
      steamId: "76561198000000001",
      total: 3,
      items: [
        expect.objectContaining({
          name: "Hades",
          hours: 25,
          game: expect.objectContaining({ id: 1 }),
          suggested: "played",
          logged: false,
        }),
        expect.objectContaining({ name: "Some Tool", hours: 1.5, game: null }),
        expect.objectContaining({
          name: "Celeste",
          game: expect.objectContaining({ id: celeste.id }),
          suggested: "backlog",
        }),
      ],
    });
    expect(state.gameEvents).toEqual([
      expect.objectContaining({ kind: "igdb_import", game_id: celeste.id }),
    ]);
  });

  it("says when the library is private", async () => {
    const { app } = buildTestApp({
      seed: seed(),
      provider,
      steam: steam("private" as never),
    });
    const response = await as(app).post("/api/v1/me/steam/preview", {
      profile: "callum",
    });
    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe("steam_private");
  });

  it("says when there's no such profile", async () => {
    const { app } = buildTestApp({ seed: seed(), provider, steam: steam() });
    const response = await as(app).post("/api/v1/me/steam/preview", {
      profile: "nobody",
    });
    expect(response.status).toBe(404);
  });

  it("adds what was chosen in one go, and leaves logged games alone", async () => {
    const base = seed();
    const s = {
      ...base,
      games: [
        ...base.games,
        buildGame({ id: 2, title: "Celeste", igdb_id: 2000 }),
      ],
      gameLogs: [
        buildGameLog({ id: 9, user_id: USER_A, game_id: 2, status: "playing" }),
      ],
    };
    const { app, state } = buildTestApp({ seed: s, provider, steam: steam() });

    const response = await as(app).post("/api/v1/me/steam/import", {
      games: [
        { gameId: 1, status: "played", hours: 25 },
        { gameId: 2, status: "backlog", hours: null },
      ],
    });

    expect(response.body).toEqual({ added: 1, skipped: 1, updated: 0 });
    expect(state.gameLogs.find((l) => l.game_id === 1)).toMatchObject({
      status: "played",
      hours_played: 25,
    });
    expect(state.gameLogs.find((l) => l.game_id === 2)!.status).toBe("playing");
  });

  it("suggests playing for a game played lately, and flags achievements", async () => {
    const { app } = buildTestApp({
      seed: seed(),
      provider,
      steam: steam([
        {
          appid: 10,
          name: "Hades",
          playtime: 1500,
          recentPlaytime: 60,
          hasStats: true,
        },
        {
          appid: 20,
          name: "Celeste",
          playtime: 0,
          recentPlaytime: 0,
          hasStats: true,
        },
      ]),
    });
    const { body } = await as(app).post("/api/v1/me/steam/preview", {
      profile: "callum",
    });
    expect(body.items).toEqual([
      expect.objectContaining({
        name: "Hades",
        suggested: "playing",
        achievements: true,
        fills: null,
      }),
      // Never played: nothing unlocked to ask about.
      expect.objectContaining({ name: "Celeste", achievements: false }),
    ]);
  });

  it("shows a game two Steam apps match once, as its most played", async () => {
    const { app } = buildTestApp({
      seed: seed(),
      provider: {
        ...provider,
        // Hades and its demo are one game here.
        fromSteam: vi.fn(
          async () =>
            new Map([
              [10, 1000],
              [11, 1000],
            ]),
        ),
      },
      steam: steam([
        {
          appid: 11,
          name: "Hades Demo",
          playtime: 30,
          recentPlaytime: 0,
          hasStats: false,
        },
        {
          appid: 10,
          name: "Hades",
          playtime: 1500,
          recentPlaytime: 0,
          hasStats: true,
        },
      ]),
    });
    const { body } = await as(app).post("/api/v1/me/steam/preview", {
      profile: "callum",
    });
    expect(body.total).toBe(2);
    expect(body.items).toEqual([
      expect.objectContaining({ appid: 10, name: "Hades", hours: 25 }),
    ]);
  });

  it("offers to fill the blanks on a game logged with no platform", async () => {
    const base = seed();
    const { app } = buildTestApp({
      seed: {
        ...base,
        gameLogs: [
          buildGameLog({
            id: 9,
            user_id: USER_A,
            game_id: 1,
            status: "played",
            system_slug: null,
            hours_played: 40,
          }),
        ],
      },
      provider,
      steam: steam(),
    });
    const { body } = await as(app).post("/api/v1/me/steam/preview", {
      profile: "callum",
    });
    expect(body.items[0]).toMatchObject({
      name: "Hades",
      logged: true,
      fills: { platform: true, hours: false, achievements: true },
    });
  });

  it("reads a batch of achievements, null for a game with none", async () => {
    const { app } = buildTestApp({ seed: seed(), provider, steam: steam() });
    const response = await as(app).post("/api/v1/me/steam/achievements", {
      steamId: "76561198000000001",
      appids: [10, 20],
    });
    expect(response.body).toEqual([
      { appid: 10, achievements: { total: 49, unlocked: 31 } },
      { appid: 20, achievements: null },
    ]);
  });

  it("says when the achievements are private", async () => {
    const { app } = buildTestApp({
      seed: seed(),
      provider,
      steam: steam(
        undefined,
        vi.fn(async () => "private" as const),
      ),
    });
    const response = await as(app).post("/api/v1/me/steam/achievements", {
      steamId: "76561198000000001",
      appids: [10],
    });
    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe("steam_private");
  });

  it("refuses achievements for anything but a Steam id, or signed out", async () => {
    const { app } = buildTestApp({ seed: seed(), provider, steam: steam() });
    expect(
      (
        await as(app).post("/api/v1/me/steam/achievements", {
          steamId: "callum",
          appids: [10],
        })
      ).status,
    ).toBe(422);
    expect(
      (
        await request(app)
          .post("/api/v1/me/steam/achievements")
          .send({ steamId: "76561198000000001", appids: [10] })
      ).status,
    ).toBe(401);
  });

  it("logs each game on Steam, with what was set for it", async () => {
    const { app, state } = buildTestApp({
      seed: seed(),
      provider,
      steam: steam(),
    });

    await as(app).post("/api/v1/me/steam/import", {
      games: [
        {
          gameId: 1,
          status: "played",
          hours: 25,
          rating: 8.5,
          playedStatus: "finished",
          achievementsTotal: 49,
          achievementsCompleted: 31,
        },
      ],
    });

    expect(state.gameLogs.find((l) => l.game_id === 1)).toMatchObject({
      status: "played",
      platform_slug: "steam",
      system_slug: "steam",
      hours_played: 25,
      rating: 8.5,
      played_status: "finished",
      achievements_total: 49,
      achievements_completed: 31,
    });
  });

  it("keeps hours for a game in progress, and no ending off the played shelf", async () => {
    const { app, state } = buildTestApp({
      seed: seed(),
      provider,
      steam: steam(),
    });
    await as(app).post("/api/v1/me/steam/import", {
      games: [
        { gameId: 1, status: "playing", hours: 3, playedStatus: "finished" },
      ],
    });
    expect(state.gameLogs.find((l) => l.game_id === 1)).toMatchObject({
      status: "playing",
      hours_played: 3,
      played_status: null,
    });
  });

  it("fills only the blanks on games already logged", async () => {
    const base = seed();
    const s = {
      ...base,
      games: [
        ...base.games,
        buildGame({ id: 2, title: "Celeste", igdb_id: 2000 }),
        buildGame({ id: 3, title: "Hollow Knight", igdb_id: 3000 }),
      ],
      gameLogs: [
        // From an earlier import: no platform, no hours.
        buildGameLog({
          id: 7,
          user_id: USER_A,
          game_id: 1,
          status: "played",
          system_slug: null,
          platform_slug: null,
          hours_played: null,
          rating: 9,
        }),
        // On Steam already, with hours they typed themselves.
        buildGameLog({
          id: 8,
          user_id: USER_A,
          game_id: 2,
          status: "played",
          system_slug: "steam",
          platform_slug: "steam",
          hours_played: 12,
        }),
        // Only on another console: nothing of Steam's to fill.
        buildGameLog({
          id: 9,
          user_id: USER_A,
          game_id: 3,
          status: "played",
          system_slug: "playstation5",
          platform_slug: "playstation",
        }),
      ],
    };
    const { app, state } = buildTestApp({ seed: s, provider, steam: steam() });

    const response = await as(app).post("/api/v1/me/steam/import", {
      games: [],
      fill: [
        {
          gameId: 1,
          hours: 25,
          achievementsTotal: 49,
          achievementsCompleted: 31,
        },
        { gameId: 2, hours: 30 },
        { gameId: 3, hours: 5 },
      ],
    });

    expect(response.body).toEqual({ added: 0, skipped: 0, updated: 1 });
    const log = (id: number) => state.gameLogs.find((l) => l.id === id)!;
    expect(log(7)).toMatchObject({
      system_slug: "steam",
      platform_slug: "steam",
      hours_played: 25,
      achievements_total: 49,
      achievements_completed: 31,
      rating: 9,
    });
    expect(log(8)).toMatchObject({
      hours_played: 12,
      achievements_total: null,
    });
    expect(log(9)).toEqual(s.gameLogs[2]);
  });

  it("refuses an import with nothing in it", async () => {
    const { app } = buildTestApp({ seed: seed(), provider, steam: steam() });
    const response = await as(app).post("/api/v1/me/steam/import", {
      games: [],
    });
    expect(response.status).toBe(422);
  });

  it("refuses more achievements unlocked than there are", async () => {
    const { app } = buildTestApp({ seed: seed(), provider, steam: steam() });
    const response = await as(app).post("/api/v1/me/steam/import", {
      games: [
        {
          gameId: 1,
          status: "played",
          hours: 1,
          achievementsTotal: 3,
          achievementsCompleted: 4,
        },
      ],
    });
    expect(response.status).toBe(422);
  });

  it("refuses the same game twice in one import", async () => {
    const { app } = buildTestApp({ seed: seed(), provider, steam: steam() });
    const response = await as(app).post("/api/v1/me/steam/import", {
      games: [
        { gameId: 1, status: "played", hours: 1 },
        { gameId: 1, status: "backlog", hours: null },
      ],
    });
    expect(response.status).toBe(422);
  });
});
