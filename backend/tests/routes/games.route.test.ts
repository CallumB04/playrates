import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { authHeader, buildTestApp, USER_A } from "../helpers/buildTestApp.js";
import { baseSeed, buildGame, buildGameLog } from "../helpers/fixtures.js";
import type { GamesProvider } from "../../src/providers/games/GamesProvider.js";

const stubProvider = (
    results: Awaited<ReturnType<GamesProvider["search"]>> = []
): GamesProvider & { search: ReturnType<typeof vi.fn> } => {
    const search = vi.fn(async () => results);
    return {
        name: "stub",
        isConfigured: true,
        search,
        getById: vi.fn(async () => results[0] ?? null),
    } as unknown as GamesProvider & { search: ReturnType<typeof vi.fn> };
};

const externalGame = {
    externalId: 777,
    slug: "hollow-knight",
    title: "Hollow Knight",
    description: "A hand-drawn metroidvania.",
    coverUrl: "https://example.test/hk.jpg",
    releaseDate: "2017-02-24",
    platformSlugs: ["other-pc"],
    isAdult: false,
    popularity: 500,
    hoursToBeat: 27,
    raw: {},
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
                games: [buildGame(), buildGame({ id: 2, title: "Portal 2", rawg_id: 4200 })],
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
                games: [buildGame(), buildGame({ id: 2, title: "Portal 2", rawg_id: 4200 })],
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
                games: [buildGame(), buildGame({ id: 2, is_adult: true, rawg_id: 9 })],
            },
        });

        const response = await request(app).get(
            "/api/v1/games?includeAdult=false"
        );

        expect(response.body.data).toHaveLength(1);
    });

    /** Was a client-side filter applied after downloading the whole catalogue. */
    it("can exclude games the caller has already logged", async () => {
        const { app } = buildTestApp({
            seed: {
                ...baseSeed(),
                games: [buildGame(), buildGame({ id: 2, title: "Portal 2", rawg_id: 4200 })],
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
            buildGame({ id: i + 1, title: `Witcher ${i}`, rawg_id: 1000 + i })
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
        expect(response.body.data[0].rawgId).toBe(externalGame.externalId);
        expect(state.games).toHaveLength(1);
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
            .send({ rawgId: 123 });

        expect(response.status).toBe(503);
        expect(response.body.error.code).toBe("not_configured");
    });

    it("returns the cached game rather than re-importing", async () => {
        const provider = stubProvider([externalGame]);
        const { app } = buildTestApp({ seed: baseSeed(), provider });

        const response = await request(app)
            .post("/api/v1/games/import")
            .set("Authorization", authHeader(USER_A))
            .send({ rawgId: 3328 });

        expect(response.status).toBe(200);
        expect(provider.getById).not.toHaveBeenCalled();
    });
});

describe("platforms and stats", () => {
    it("lists platforms", async () => {
        const { app } = buildTestApp({ seed: baseSeed() });

        const response = await request(app).get("/api/v1/platforms");

        expect(response.status).toBe(200);
        expect(response.body.data[0].slug).toBe("steam");
        expect(response.body.data[0].displayName).toBe("Steam");
    });

    /** Replaces three whole-table fetches the home page used to perform. */
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
