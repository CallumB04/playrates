import { describe, expect, it } from "vitest";
import request from "supertest";
import { authHeader, buildTestApp, USER_A, USER_B } from "../helpers/buildTestApp.js";
import { baseSeed, buildGameLog } from "../helpers/fixtures.js";

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
     * `id` used to BE the game id, because logs had no identity of their own.
     * This pins the new meaning so the change cannot silently regress.
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
        expect(response.body.data[0].game.title).toBe(
            "The Witcher 3: Wild Hunt"
        );
        expect(response.body.data[0].game.platforms).toEqual(["steam"]);
    });

    it("deletes with a 204 and an empty body", async () => {
        const { app, state } = buildTestApp({
            seed: { ...baseSeed(), gameLogs: [buildGameLog()] },
        });

        const response = await request(app)
            .delete("/api/v1/me/game-logs/1")
            .set("Authorization", authHeader(USER_A));

        // the old routes sent JSON with a 204, which Node silently drops
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

        const response = await request(app).get(
            "/api/v1/users/devuser/game-logs"
        );

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
});
