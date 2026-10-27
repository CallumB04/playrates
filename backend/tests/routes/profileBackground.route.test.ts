import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { GameBackdrop } from "@playrates/shared";
import {
  nullGamesProvider,
  type GamesProvider,
} from "../../src/providers/games/GamesProvider.js";
import { authHeader, buildTestApp, USER_A } from "../helpers/buildTestApp.js";
import { baseSeed, buildGame, buildGameLog } from "../helpers/fixtures.js";

const SHOT: GameBackdrop = {
  url: "https://images.igdb.com/igdb/image/upload/t_1080p/sc1.jpg",
  thumbUrl:
    "https://images.igdb.com/igdb/image/upload/t_screenshot_med/sc1.jpg",
};

const igdb = (backdrops: GameBackdrop[] = [SHOT]) => {
  const backdropsOf = vi.fn(async () => backdrops);
  const provider: GamesProvider = {
    ...nullGamesProvider,
    isConfigured: true,
    backdropsOf,
  };
  return { provider, backdropsOf };
};

describe("a game's backdrops", () => {
  it("asks IGDB the first time, and keeps the answer", async () => {
    const { provider, backdropsOf } = igdb();
    const { app } = buildTestApp({ seed: baseSeed(), provider });

    const first = await request(app).get("/api/v1/games/1/backdrops");
    const second = await request(app).get("/api/v1/games/1/backdrops");

    expect(first.status).toBe(200);
    expect(first.body).toEqual([SHOT]);
    expect(second.body).toEqual([SHOT]);
    expect(backdropsOf).toHaveBeenCalledOnce();
    expect(backdropsOf).toHaveBeenCalledWith(1942);
  });

  it("falls back to the banner when there is nothing else", async () => {
    const banner = "https://example.test/banner.jpg";
    const { app } = buildTestApp({
      seed: { ...baseSeed(), games: [buildGame({ banner_url: banner })] },
    });

    const response = await request(app).get("/api/v1/games/1/backdrops");

    expect(response.body).toEqual([{ url: banner, thumbUrl: banner }]);
  });

  it("offers nothing from an adult game, whose art a profile would show to everyone", async () => {
    const { provider, backdropsOf } = igdb();
    const { app } = buildTestApp({
      seed: {
        ...baseSeed(),
        games: [buildGame({ has_sexual_content: true })],
      },
      provider,
    });

    const response = await request(app).get("/api/v1/games/1/backdrops");

    expect(response.body).toEqual([]);
    expect(backdropsOf).not.toHaveBeenCalled();
  });

  it("does not keep a failed fetch, so the next ask tries again", async () => {
    const { provider, backdropsOf } = igdb();
    backdropsOf.mockRejectedValueOnce(new Error("IGDB is down"));
    const { app } = buildTestApp({ seed: baseSeed(), provider });

    const failed = await request(app).get("/api/v1/games/1/backdrops");
    const retried = await request(app).get("/api/v1/games/1/backdrops");

    expect(failed.status).toBe(200);
    expect(failed.body).toEqual([]);
    expect(retried.body).toEqual([SHOT]);
  });

  it("is a 404 for a game that isn't there", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });
    const response = await request(app).get("/api/v1/games/999/backdrops");
    expect(response.status).toBe(404);
  });
});

describe("a profile's background", () => {
  const seed = (logged = true) => ({
    ...baseSeed(),
    gameLogs: logged ? [buildGameLog({ game_id: 1, status: "wishlist" })] : [],
  });

  const put = (app: Parameters<typeof request>[0], body: object) =>
    request(app)
      .put("/api/v1/profiles/me/background")
      .set("Authorization", authHeader(USER_A))
      .send(body);

  it("takes one of a logged game's pictures, and shows it on the profile", async () => {
    const { app } = buildTestApp({ seed: seed(), provider: igdb().provider });

    const response = await put(app, { gameId: 1, url: SHOT.url });

    expect(response.status).toBe(200);
    // No position given, so the default one.
    const worn = { url: SHOT.url, gameId: 1, position: 30 };
    expect(response.body.background).toEqual(worn);
    const visitor = await request(app).get("/api/v1/profiles/devuser");
    expect(visitor.body.background).toEqual(worn);
  });

  it("keeps the part of the picture its owner chose", async () => {
    const { app } = buildTestApp({ seed: seed(), provider: igdb().provider });

    const response = await put(app, { gameId: 1, url: SHOT.url, position: 85 });

    expect(response.body.background.position).toBe(85);
  });

  it("refuses a position off the picture", async () => {
    const { app } = buildTestApp({ seed: seed(), provider: igdb().provider });

    for (const position of [-1, 101, 40.5]) {
      const response = await put(app, { gameId: 1, url: SHOT.url, position });
      expect(response.status, String(position)).toBe(422);
    }
  });

  it("refuses a game the owner hasn't logged", async () => {
    const { app } = buildTestApp({
      seed: seed(false),
      provider: igdb().provider,
    });

    const response = await put(app, { gameId: 1, url: SHOT.url });

    expect(response.status).toBe(403);
  });

  /* Anything else would put any URL at all on a public page. */
  it("refuses a picture the game doesn't offer", async () => {
    const { app } = buildTestApp({ seed: seed(), provider: igdb().provider });

    const response = await put(app, {
      gameId: 1,
      url: "https://example.test/anything.jpg",
    });

    expect(response.status).toBe(422);
    const profile = await request(app).get("/api/v1/profiles/devuser");
    expect(profile.body.background).toBeNull();
  });

  it("goes back to the colour when cleared", async () => {
    const { app } = buildTestApp({ seed: seed(), provider: igdb().provider });
    await put(app, { gameId: 1, url: SHOT.url });

    const response = await request(app)
      .delete("/api/v1/profiles/me/background")
      .set("Authorization", authHeader(USER_A));

    expect(response.status).toBe(200);
    expect(response.body.background).toBeNull();
  });

  it("needs a signed-in owner", async () => {
    const { app } = buildTestApp({ seed: seed(), provider: igdb().provider });
    const response = await request(app)
      .put("/api/v1/profiles/me/background")
      .send({ gameId: 1, url: SHOT.url });
    expect(response.status).toBe(401);
  });
});
