import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { AppError } from "../../src/lib/AppError.js";
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
  buildPlatform,
  buildPlatformSystem,
  buildProfile,
  buildFriendship,
  buildReview,
} from "../helpers/fixtures.js";
import type {
  ExternalGame,
  GamesProvider,
} from "../../src/providers/games/GamesProvider.js";

const stubProvider = (
  results: Awaited<ReturnType<GamesProvider["search"]>> = [],
): GamesProvider & { search: ReturnType<typeof vi.fn> } => {
  const search = vi.fn(async () => results);
  return {
    name: "stub",
    isConfigured: true,
    search,
    getById: vi.fn(async () => results[0] ?? null),
  } as unknown as GamesProvider & { search: ReturnType<typeof vi.fn> };
};

const externalGame: ExternalGame = {
  externalId: 777,
  slug: "hollow-knight",
  title: "Hollow Knight",
  description: "A hand-drawn metroidvania.",
  coverUrl: "https://example.test/hk.jpg",
  boxArtUrl: null,
  bannerUrl: null,
  releaseDate: "2017-02-24",
  platformSlugs: ["other-pc"],
  systemSlugs: ["other-pc"],
  genres: [{ slug: "metroidvania", name: "Metroidvania" }],
  developers: ["Team Cherry"],
  publishers: ["Team Cherry"],
  website: "https://www.hollowknight.com",
  esrbRating: "Everyone 10+",
  hasSexualContent: false,
  criticScore: 90,
  igdbRatingCount: 4200,
  similarIds: [],
  series: null,
  altCovers: [],
};

describe("games", () => {
  it("lists games without authentication", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app).get("/api/v1/games");

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.meta.total).toBe(1);
  });

  it("filters by title", async () => {
    const { app } = buildTestApp({
      seed: {
        ...baseSeed(),
        games: [
          buildGame(),
          buildGame({ id: 2, title: "Portal 2", igdb_id: 4200 }),
        ],
      },
    });

    const response = await request(app).get("/api/v1/games?search=portal");

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].title).toBe("Portal 2");
  });

  it("filters by platform", async () => {
    const { app } = buildTestApp({
      seed: {
        ...baseSeed(),
        games: [
          buildGame(),
          buildGame({ id: 2, title: "Portal 2", igdb_id: 4200 }),
        ],
        gamePlatforms: [{ game_id: 2, platform_slug: "xbox" }],
      },
    });

    const response = await request(app).get("/api/v1/games?platform=xbox");

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe(2);
  });

  it("can exclude adult games", async () => {
    const { app } = buildTestApp({
      seed: {
        ...baseSeed(),
        games: [
          buildGame(),
          buildGame({ id: 2, has_sexual_content: true, igdb_id: 9 }),
        ],
      },
    });

    const response = await request(app).get("/api/v1/games?includeAdult=false");

    expect(response.body.data).toHaveLength(1);
  });

  /** Filtering happens in SQL, so the client never holds the full catalogue. */
  it("can exclude games the caller has already logged", async () => {
    const { app } = buildTestApp({
      seed: {
        ...baseSeed(),
        games: [
          buildGame(),
          buildGame({ id: 2, title: "Portal 2", igdb_id: 4200 }),
        ],
        gameLogs: [buildGameLog({ game_id: 1 })],
      },
    });

    const response = await request(app)
      .get("/api/v1/games?excludeLogged=true")
      .set("Authorization", authHeader(USER_A));

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe(2);
  });

  it("returns 404 for an unknown game", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app).get("/api/v1/games/999");

    expect(response.status).toBe(404);
  });

  it("rejects a non-numeric game id", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app).get("/api/v1/games/abc");

    expect(response.status).toBe(422);
  });

  it("reports per-status counts and the average rating", async () => {
    const { app } = buildTestApp({
      seed: {
        ...baseSeed(),
        gameLogs: [
          buildGameLog({ id: 1, rating: 8 }),
          buildGameLog({
            id: 2,
            user_id: "22222222-2222-2222-2222-222222222222",
            status: "backlog",
            rating: 10,
          }),
        ],
      },
    });

    const response = await request(app).get("/api/v1/games/1/stats");

    expect(response.status).toBe(200);
    expect(response.body.logCount).toBe(2);
    expect(response.body.byStatus.played).toBe(1);
    expect(response.body.byStatus.backlog).toBe(1);
    expect(response.body.averageRating).toBe(9);
    expect(response.body.ratingCount).toBe(2);
  });

  it("returns a null average when nothing is rated", async () => {
    const { app } = buildTestApp({
      seed: { ...baseSeed(), gameLogs: [buildGameLog({ rating: null })] },
    });

    const response = await request(app).get("/api/v1/games/1/stats");

    expect(response.body.averageRating).toBeNull();
  });

  it("does not call the provider when the local cache is warm", async () => {
    const provider = stubProvider();
    const games = Array.from({ length: 10 }, (_, i) =>
      buildGame({ id: i + 1, title: `Witcher ${i}`, igdb_id: 1000 + i }),
    );
    const { app } = buildTestApp({
      seed: { ...baseSeed(), games },
      provider,
    });

    const response = await request(app)
      .get("/api/v1/games/search?q=Witcher")
      .set("Authorization", authHeader(USER_A));

    expect(response.status).toBe(200);
    expect(provider.search).not.toHaveBeenCalled();
  });

  /**
   * The important part: after falling through to the provider, the ids that
   * come back must be ours, never the upstream ones.
   */
  it("caches provider results and returns internal ids", async () => {
    const provider = stubProvider([externalGame]);
    const { app, state } = buildTestApp({
      seed: { ...baseSeed(), games: [] },
      provider,
    });

    const response = await request(app)
      .get("/api/v1/games/search?q=hollow")
      .set("Authorization", authHeader(USER_A));

    expect(provider.search).toHaveBeenCalledOnce();
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].title).toBe("Hollow Knight");
    expect(response.body.data[0].id).not.toBe(externalGame.externalId);
    expect(response.body.data[0].igdbId).toBe(externalGame.externalId);
    expect(state.games).toHaveLength(1);
  });

  /* An IGDB outage must not take search down with it: the
     catalogue is already ours, and thin local results are better than none. */
  it("still answers from the catalogue when the provider is refusing", async () => {
    const provider = stubProvider();
    provider.search = vi.fn(async () => {
      throw AppError.upstream("IGDB request failed with status 401");
    }) as never;

    const { app } = buildTestApp({ seed: baseSeed(), provider });

    const response = await request(app)
      .get("/api/v1/games/search?q=witch")
      .set("Authorization", authHeader(USER_A));

    expect(response.status).toBe(200);
    expect(response.body.data[0].title).toContain("Witcher");
  });

  it("requires authentication to search", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app).get("/api/v1/games/search?q=x");

    expect(response.status).toBe(401);
  });

  it("returns 503 when importing with no provider configured", async () => {
    const { app } = buildTestApp({ seed: { ...baseSeed(), games: [] } });

    const response = await request(app)
      .post("/api/v1/games/import")
      .set("Authorization", authHeader(USER_A))
      .send({ igdbId: 123 });

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe("not_configured");
  });

  it("returns the cached game rather than re-importing", async () => {
    const provider = stubProvider([externalGame]);
    const { app } = buildTestApp({ seed: baseSeed(), provider });

    const response = await request(app)
      .post("/api/v1/games/import")
      .set("Authorization", authHeader(USER_A))
      .send({ igdbId: 1942 });

    expect(response.status).toBe(200);
    expect(provider.getById).not.toHaveBeenCalled();
  });
});

describe("platforms and stats", () => {
  it("lists games without counting them when asked not to", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app).get("/api/v1/games?count=false&limit=1");

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
  });

  it("lists platforms", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app).get("/api/v1/platforms");

    expect(response.status).toBe(200);
    expect(response.body.data[0].slug).toBe("steam");
    expect(response.body.data[0].displayName).toBe("Steam");
  });

  it("lists the machines within each family", async () => {
    const { app } = buildTestApp({
      seed: {
        ...baseSeed(),
        platforms: [
          buildPlatform(),
          buildPlatform({ slug: "playstation", display_name: "PlayStation" }),
        ],
        platformSystems: [
          buildPlatformSystem(),
          buildPlatformSystem({
            slug: "playstation5",
            display_name: "PlayStation 5",
            platform_slug: "playstation",
            sort_order: 4010,
          }),
        ],
      },
    });

    const response = await request(app).get("/api/v1/platforms/systems");

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([
      {
        slug: "steam",
        displayName: "Steam",
        platformSlug: "steam",
        sortOrder: 10,
      },
      {
        slug: "playstation5",
        displayName: "PlayStation 5",
        platformSlug: "playstation",
        sortOrder: 4010,
      },
    ]);
  });

  it("carries a game's machines alongside its families", async () => {
    const { app } = buildTestApp({
      seed: {
        ...baseSeed(),
        gamePlatforms: [{ game_id: 1, platform_slug: "steam" }],
        gameSystems: [
          { game_id: 1, system_slug: "steam" },
          { game_id: 1, system_slug: "playstation5" },
        ],
      },
    });

    const response = await request(app).get("/api/v1/games/1");

    expect(response.status).toBe(200);
    expect(response.body.platforms).toEqual(["steam"]);
    expect(response.body.systems).toEqual(["steam", "playstation5"]);
  });

  /** Counts only — the home page should never fetch rows to show a total. */
  it("returns counts without exposing any records", async () => {
    const { app } = buildTestApp({
      seed: { ...baseSeed(), gameLogs: [buildGameLog()] },
    });

    const response = await request(app).get("/api/v1/stats");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      userCount: 2,
      gameCount: 1,
      logCount: 1,
    });
  });
});

describe("the trending rail", () => {
  /* buildGame is trending by default, so everything that is not part of the
     curated set has to say so. Six flagged, two of them explicit: a viewer
     who has not opted in sees four, which is what shipped. */
  const trending = (i: number, overrides = {}) =>
    buildGame({
      id: i + 1,
      slug: `trending-${i}`,
      title: `Trending ${i}`,
      is_trending: true,
      log_count: 0,
      ...overrides,
    });

  const logged = (i: number) =>
    buildGame({
      id: 20 + i,
      slug: `logged-${i}`,
      title: `Logged ${i}`,
      is_trending: false,
      log_count: 100 - i,
    });

  const seed = () => ({
    games: [
      ...Array.from({ length: 4 }, (_, i) => trending(i)),
      trending(10, { has_sexual_content: true, title: "Explicit 0" }),
      trending(11, { has_sexual_content: true, title: "Explicit 1" }),
      ...Array.from({ length: 5 }, (_, i) => logged(i)),
    ],
  });

  const titles = (body: { data: { title: string }[] }) =>
    body.data.map((g) => g.title);

  const rail = (app: Parameters<typeof request>[0]) =>
    request(app).get("/api/v1/games?trending=true&limit=24");

  it("makes up the shortfall the content filter leaves", async () => {
    const { app } = buildTestApp({ seed: seed() });

    const response = await rail(app);

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThanOrEqual(6);
  });

  it("puts what is actually trending first, and tops up behind it", async () => {
    const { app } = buildTestApp({ seed: seed() });

    const shown = titles((await rail(app)).body);

    expect(shown.slice(0, 4).every((t) => t.startsWith("Trending"))).toBe(true);
    expect(shown.slice(4)).toEqual(["Logged 0", "Logged 1"]);
    expect(new Set(shown).size).toBe(shown.length);
  });

  it("never tops up with something the viewer may not see", async () => {
    const { app } = buildTestApp({ seed: seed() });

    const shown = titles((await rail(app)).body);

    expect(shown).not.toContain("Explicit 0");
    expect(shown).not.toContain("Explicit 1");
  });

  /* Enough flagged to fill the rail on its own: nothing else belongs in it. */
  it("leaves a full rail alone", async () => {
    const { app } = buildTestApp({
      seed: {
        games: [
          ...Array.from({ length: 7 }, (_, i) => trending(i)),
          buildGame({
            id: 50,
            slug: "popular",
            title: "Popular",
            is_trending: false,
            log_count: 999,
          }),
        ],
      },
    });

    const shown = titles((await rail(app)).body);

    expect(shown).toHaveLength(7);
    expect(shown).not.toContain("Popular");
  });

  it("does not top up a page past the first", async () => {
    const { app } = buildTestApp({ seed: seed() });

    const response = await request(app).get(
      "/api/v1/games?trending=true&limit=24&page=2",
    );

    expect(response.body.data).toHaveLength(0);
  });
});

/* The filter existed and search went round it: a signed-in user with explicit
   content off searched "hentai" and got it. */
describe("explicit content stays hidden", () => {
  const seed = () => ({
    profiles: [buildProfile({ id: USER_A, show_sexual_content: false })],
    games: [
      buildGame({ id: 1, slug: "clean", title: "Hollow Knight" }),
      buildGame({
        id: 2,
        slug: "explicit",
        title: "Hentai Girl",
        has_sexual_content: true,
      }),
    ],
  });

  const optedIn = () => ({
    ...seed(),
    profiles: [buildProfile({ id: USER_A, show_sexual_content: true })],
  });

  it("keeps it out of search for someone who has it off", async () => {
    const { app } = buildTestApp({ seed: seed() });

    const response = await request(app)
      .get("/api/v1/games/search?q=hentai&remote=false")
      .set("Authorization", authHeader(USER_A));

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(0);
  });

  it("keeps it out of the listing too", async () => {
    const { app } = buildTestApp({ seed: seed() });

    const response = await request(app)
      .get("/api/v1/games?search=hentai")
      .set("Authorization", authHeader(USER_A));

    expect(response.body.data).toHaveLength(0);
  });

  /* Hiding it from every listing and then serving it to anyone with the link
     is not hiding it. */
  it("will not serve its page either", async () => {
    const { app } = buildTestApp({ seed: seed() });

    const response = await request(app)
      .get("/api/v1/games/2")
      .set("Authorization", authHeader(USER_A));

    expect(response.status).toBe(404);
  });

  it("will not serve its page to someone signed out", async () => {
    const { app } = buildTestApp({ seed: seed() });

    expect((await request(app).get("/api/v1/games/2")).status).toBe(404);
  });

  it("still serves everything else", async () => {
    const { app } = buildTestApp({ seed: seed() });

    const search = await request(app)
      .get("/api/v1/games/search?q=hollow&remote=false")
      .set("Authorization", authHeader(USER_A));
    const page = await request(app).get("/api/v1/games/1");

    expect(search.body.data).toHaveLength(1);
    expect(page.status).toBe(200);
  });

  /* The front page is shown to people who went looking for neither. A
     friend's choice to log it is not the viewer's choice to see it. */
  it("keeps it out of recent reviews and the friend feed", async () => {
    const { app } = buildTestApp({
      seed: {
        ...seed(),
        profiles: [
          buildProfile({ id: USER_A, show_sexual_content: false }),
          buildProfile({ id: USER_B, username: "friend" }),
        ],
        friendships: [
          buildFriendship({
            user_a_id: USER_A,
            user_b_id: USER_B,
            status: "accepted",
          }),
        ],
        gameLogs: [buildGameLog({ id: 1, user_id: USER_B, game_id: 2 })],
        reviews: [buildReview({ id: 1, user_id: USER_B, game_id: 2 })],
      },
    });

    const reviews = await request(app).get("/api/v1/reviews");
    const feed = await request(app)
      .get("/api/v1/me/friends/activity")
      .set("Authorization", authHeader(USER_A));

    expect(reviews.body.data).toHaveLength(0);
    expect(feed.body.data).toHaveLength(0);
  });

  it("shows it to someone who has opted in", async () => {
    const { app } = buildTestApp({ seed: optedIn() });

    const search = await request(app)
      .get("/api/v1/games/search?q=hentai&remote=false")
      .set("Authorization", authHeader(USER_A));
    const page = await request(app)
      .get("/api/v1/games/2")
      .set("Authorization", authHeader(USER_A));

    expect(search.body.data).toHaveLength(1);
    expect(page.status).toBe(200);
  });
});

describe("related games", () => {
  const related = (overrides: Parameters<typeof buildGame>[0]) =>
    buildGame({ developers: [], ...overrides });

  const seed = () => ({
    ...baseSeed(),
    games: [
      related({
        id: 1,
        title: "The Witcher 3",
        series_id: 62,
        series_name: "The Witcher",
        developers: ["CD Projekt RED"],
        similar_igdb_ids: [900, 901, 777, 999],
      }),
      related({ id: 2, title: "The Witcher 2", igdb_id: 500, series_id: 62, release_date: "2011-05-17", igdb_rating_count: 1500 }),
      related({ id: 3, title: "The Witcher", igdb_id: 501, series_id: 62, release_date: "2007-10-26", igdb_rating_count: 900 }),
      // Newer, but a side-game hardly anyone has rated.
      related({ id: 7, title: "Roach Race", igdb_id: 502, series_id: 62, release_date: "2022-09-06", igdb_rating_count: 3 }),
      related({ id: 4, title: "Cyberpunk 2077", igdb_id: 777, developers: ["CD Projekt RED"], igdb_rating_count: 900 }),
      related({ id: 5, title: "Dragon Age", igdb_id: 900 }),
      related({ id: 6, title: "Explicit", igdb_id: 901, has_sexual_content: true }),
    ],
  });

  it("gives the series best known first, the developer's other games, and similar ones, none twice", async () => {
    const { app } = buildTestApp({ seed: seed() });

    const response = await request(app).get("/api/v1/games/1/related");

    expect(response.status).toBe(200);
    const titles = (games: { title: string }[]) => games.map((g) => g.title);
    expect(response.body.series.name).toBe("The Witcher");
    expect(titles(response.body.series.games)).toEqual([
      "The Witcher 2",
      "The Witcher",
      "Roach Race",
    ]);
    expect(response.body.developer.name).toBe("CD Projekt RED");
    expect(titles(response.body.developer.games)).toEqual(["Cyberpunk 2077"]);
    // Cyberpunk is already under the developer; the explicit one stays hidden.
    expect(titles(response.body.similar)).toEqual(["Dragon Age"]);
  });

  it("leaves out a part with nothing in it", async () => {
    const { app } = buildTestApp({
      seed: { ...baseSeed(), games: [related({ id: 1, title: "Alone" })] },
    });

    const response = await request(app).get("/api/v1/games/1/related");

    expect(response.body).toEqual({ series: null, developer: null, similar: [] });
  });

  it("404s a game that isn't there", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });
    expect((await request(app).get("/api/v1/games/999/related")).status).toBe(404);
  });
});
