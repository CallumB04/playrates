import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import {
  BACKGROUND_LEVEL,
  xpForLevel,
  type GameBackdrop,
} from "@playrates/shared";
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

  /** With the picture bought, as wearing one needs. */
  const owning = (logged = true) => {
    const built = buildTestApp({
      seed: seed(logged),
      provider: igdb().provider,
    });
    built.state.userBackgrounds.push({
      user_id: USER_A,
      game_id: 1,
      url: SHOT.url,
      price: 0,
    });
    return built;
  };

  const put = (app: Parameters<typeof request>[0], body: object) =>
    request(app)
      .put("/api/v1/profiles/me/background")
      .set("Authorization", authHeader(USER_A))
      .send(body);

  it("takes one of a logged game's pictures, and shows it on the profile", async () => {
    const { app } = owning();

    const response = await put(app, { gameId: 1, url: SHOT.url });

    expect(response.status).toBe(200);
    // No position given, so the default one.
    const worn = { url: SHOT.url, gameId: 1, position: 30 };
    expect(response.body.background).toEqual(worn);
    const visitor = await request(app).get("/api/v1/profiles/devuser");
    expect(visitor.body.background).toEqual(worn);
  });

  it("keeps the part of the picture its owner chose", async () => {
    const { app } = owning();

    const response = await put(app, { gameId: 1, url: SHOT.url, position: 85 });

    expect(response.body.background.position).toBe(85);
  });

  it("refuses a position off the picture", async () => {
    const { app } = owning();

    for (const position of [-1, 101, 40.5]) {
      const response = await put(app, { gameId: 1, url: SHOT.url, position });
      expect(response.status, String(position)).toBe(422);
    }
  });

  it("refuses a game the owner hasn't logged", async () => {
    const { app } = owning(false);

    const response = await put(app, { gameId: 1, url: SHOT.url });

    expect(response.status).toBe(403);
  });

  /* Anything else would put any URL at all on a public page. */
  it("refuses a picture the game doesn't offer", async () => {
    const { app } = owning();

    const response = await put(app, {
      gameId: 1,
      url: "https://example.test/anything.jpg",
    });

    expect(response.status).toBe(422);
    const profile = await request(app).get("/api/v1/profiles/devuser");
    expect(profile.body.background).toBeNull();
  });

  it("refuses a picture that hasn't been bought", async () => {
    const { app, state } = owning();
    state.userBackgrounds = [];

    const response = await put(app, { gameId: 1, url: SHOT.url });

    expect(response.status).toBe(402);
  });

  it("goes back to the colour when cleared", async () => {
    const { app } = owning();
    await put(app, { gameId: 1, url: SHOT.url });

    const response = await request(app)
      .delete("/api/v1/profiles/me/background")
      .set("Authorization", authHeader(USER_A));

    expect(response.status).toBe(200);
    expect(response.body.background).toBeNull();
  });

  it("needs a signed-in owner", async () => {
    const { app } = owning();
    const response = await request(app)
      .put("/api/v1/profiles/me/background")
      .send({ gameId: 1, url: SHOT.url });
    expect(response.status).toBe(401);
  });
});

describe("buying a background", () => {
  const SECOND: GameBackdrop = {
    url: "https://images.igdb.com/igdb/image/upload/t_1080p/sc2.jpg",
    thumbUrl:
      "https://images.igdb.com/igdb/image/upload/t_screenshot_med/sc2.jpg",
  };
  const THIRD: GameBackdrop = {
    url: "https://images.igdb.com/igdb/image/upload/t_1080p/sc3.jpg",
    thumbUrl:
      "https://images.igdb.com/igdb/image/upload/t_screenshot_med/sc3.jpg",
  };

  const build = (xp = xpForLevel(BACKGROUND_LEVEL)) => {
    const built = buildTestApp({
      seed: {
        ...baseSeed(),
        gameLogs: [buildGameLog({ game_id: 1, status: "wishlist" })],
      },
      provider: igdb([SHOT, SECOND, THIRD]).provider,
    });
    const me = () =>
      request(built.app)
        .get("/api/v1/me/progress")
        .set("Authorization", authHeader(USER_A));
    const buy = (url: string) =>
      request(built.app)
        .post("/api/v1/me/backgrounds")
        .set("Authorization", authHeader(USER_A))
        .send({ gameId: 1, url });
    const mine = async () =>
      (
        await request(built.app)
          .get("/api/v1/me/backgrounds")
          .set("Authorization", authHeader(USER_A))
      ).body;
    void built.repos.progress.awardXp(USER_A, "quest", "q", xp);
    return { ...built, me, buy, mine };
  };

  it("stays shut below its level", async () => {
    const { buy, mine, me } = build(0);
    await me();
    expect((await mine()).unlocked).toBe(false);
    expect((await buy(SHOT.url)).status).toBe(403);
  });

  it("gives the first picture free, then charges more for each from the same game", async () => {
    const { buy, mine, me, repos } = build();
    await me();
    expect(await mine()).toMatchObject({ unlocked: true, credits: 1 });
    // A second look pays no second free picture.
    await me();
    expect((await mine()).credits).toBe(1);

    expect((await buy(SHOT.url)).body).toMatchObject({ cost: 0 });
    // Levels 2 and 3 paid 5 tokens each; with 25 more, enough for the
    // next, not the one after.
    await repos.progress.awardTokens(USER_A, "test", "t0", 25);
    expect((await buy(SECOND.url)).body).toEqual({ cost: 35, tokens: 0 });
    expect((await buy(THIRD.url)).status).toBe(402);

    await repos.progress.awardTokens(USER_A, "test", "t", 100);
    expect((await buy(THIRD.url)).body).toMatchObject({ cost: 45 });
    expect((await buy(THIRD.url)).status).toBe(409);

    expect((await mine()).games).toEqual([
      expect.objectContaining({
        gameId: 1,
        urls: [SHOT.url, SECOND.url, THIRD.url],
      }),
    ]);
  });

  it("only sells a logged game's own pictures", async () => {
    const { buy, me } = build();
    await me();
    expect((await buy("https://example.test/anything.jpg")).status).toBe(422);
  });
});
