import { describe, expect, it } from "vitest";
import request from "supertest";
import { authHeader, buildTestApp, USER_A, USER_B } from "../helpers/buildTestApp.js";
import { baseSeed, buildFriendship } from "../helpers/fixtures.js";

describe("friends", () => {
    it("sends a friend request", async () => {
        const { app, state } = buildTestApp({ seed: baseSeed() });

        const response = await request(app)
            .post("/api/v1/me/friends/requests")
            .set("Authorization", authHeader(USER_A))
            .send({ userId: USER_B });

        expect(response.status).toBe(201);
        expect(response.body.status).toBe("request-sent");
        expect(response.body.user.username).toBe("frienduser");
        expect(state.friendships).toHaveLength(1);
    });

    it("shows the request as received from the other side", async () => {
        const { app } = buildTestApp({
            seed: { ...baseSeed(), friendships: [buildFriendship()] },
        });

        const response = await request(app)
            .get("/api/v1/me/friends")
            .set("Authorization", authHeader(USER_B));

        expect(response.body.data[0].status).toBe("request-received");
        expect(response.body.data[0].user.username).toBe("devuser");
    });

    /**
     * The old route pushed a new pair of rows on every call with no duplicate
     * check, so double-clicking "add friend" corrupted both users' lists.
     */
    it("rejects a duplicate request instead of creating another row", async () => {
        const { app, state } = buildTestApp({
            seed: { ...baseSeed(), friendships: [buildFriendship()] },
        });

        const response = await request(app)
            .post("/api/v1/me/friends/requests")
            .set("Authorization", authHeader(USER_A))
            .send({ userId: USER_B });

        expect(response.status).toBe(409);
        expect(response.body.error.code).toBe("already_exists");
        expect(state.friendships).toHaveLength(1);
    });

    it("rejects befriending yourself", async () => {
        const { app } = buildTestApp({ seed: baseSeed() });

        const response = await request(app)
            .post("/api/v1/me/friends/requests")
            .set("Authorization", authHeader(USER_A))
            .send({ userId: USER_A });

        expect(response.status).toBe(422);
        expect(response.body.error.code).toBe("self_friend");
    });

    it("returns 404 for a request to a user that does not exist", async () => {
        const { app } = buildTestApp({ seed: baseSeed() });

        const response = await request(app)
            .post("/api/v1/me/friends/requests")
            .set("Authorization", authHeader(USER_A))
            .send({ userId: "99999999-9999-9999-9999-999999999999" });

        expect(response.status).toBe(404);
    });

    it("accepts a request, and both sides then read as friends", async () => {
        const { app } = buildTestApp({
            seed: { ...baseSeed(), friendships: [buildFriendship()] },
        });

        const accept = await request(app)
            .post(`/api/v1/me/friends/${USER_A}/accept`)
            .set("Authorization", authHeader(USER_B));

        expect(accept.status).toBe(200);
        expect(accept.body.status).toBe("friend");

        const asSender = await request(app)
            .get("/api/v1/me/friends")
            .set("Authorization", authHeader(USER_A));

        expect(asSender.body.data[0].status).toBe("friend");
    });

    it("does not let the requester accept their own request", async () => {
        const { app } = buildTestApp({
            seed: { ...baseSeed(), friendships: [buildFriendship()] },
        });

        const response = await request(app)
            .post(`/api/v1/me/friends/${USER_B}/accept`)
            .set("Authorization", authHeader(USER_A));

        expect(response.status).toBe(403);
    });

    it("returns 404 accepting a request that does not exist", async () => {
        const { app } = buildTestApp({ seed: baseSeed() });

        const response = await request(app)
            .post(`/api/v1/me/friends/${USER_B}/accept`)
            .set("Authorization", authHeader(USER_A));

        expect(response.status).toBe(404);
    });

    /** One DELETE replaces the old decline, cancel and remove routes. */
    it("removes the relationship from both sides", async () => {
        const { app, state } = buildTestApp({
            seed: {
                ...baseSeed(),
                friendships: [buildFriendship({ status: "accepted" })],
            },
        });

        const response = await request(app)
            .delete(`/api/v1/me/friends/${USER_B}`)
            .set("Authorization", authHeader(USER_A));

        expect(response.status).toBe(204);
        expect(response.text).toBe("");
        expect(state.friendships).toHaveLength(0);
    });

    it("lets the recipient decline via the same endpoint", async () => {
        const { app, state } = buildTestApp({
            seed: { ...baseSeed(), friendships: [buildFriendship()] },
        });

        const response = await request(app)
            .delete(`/api/v1/me/friends/${USER_A}`)
            .set("Authorization", authHeader(USER_B));

        expect(response.status).toBe(204);
        expect(state.friendships).toHaveLength(0);
    });

    it("filters the list by status", async () => {
        const { app } = buildTestApp({
            seed: { ...baseSeed(), friendships: [buildFriendship()] },
        });

        const friends = await request(app)
            .get("/api/v1/me/friends?status=friend")
            .set("Authorization", authHeader(USER_A));
        const sent = await request(app)
            .get("/api/v1/me/friends?status=request-sent")
            .set("Authorization", authHeader(USER_A));

        expect(friends.body.data).toHaveLength(0);
        expect(sent.body.data).toHaveLength(1);
    });

    it("requires authentication to mutate", async () => {
        const { app } = buildTestApp({ seed: baseSeed() });

        const response = await request(app)
            .post("/api/v1/me/friends/requests")
            .send({ userId: USER_B });

        expect(response.status).toBe(401);
    });
});
