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
    { appid: 10, name: "Hades", playtime: 1500 },
    { appid: 20, name: "Celeste", playtime: 0 },
    { appid: 30, name: "Some Tool", playtime: 90 },
  ],
): SteamClient => ({
  resolveVanity: vi.fn(async (name: string) =>
    name === "callum" ? "76561198000000001" : null,
  ),
  ownedGames: vi.fn(async () => games),
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

    expect(response.body).toEqual({ added: 1, skipped: 1 });
    expect(state.gameLogs.find((l) => l.game_id === 1)).toMatchObject({
      status: "played",
      hours_played: 25,
    });
    expect(state.gameLogs.find((l) => l.game_id === 2)!.status).toBe("playing");
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
