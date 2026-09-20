import { describe, expect, it } from "vitest";
import request from "supertest";
import {
  authHeader,
  buildTestApp,
  USER_A,
  USER_B,
} from "../helpers/buildTestApp.js";
import {
  baseSeed,
  buildFriendship,
  buildGameLog,
  buildReview,
} from "../helpers/fixtures.js";

describe("profiles", () => {
  it("updates the caller's own bio", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app)
      .patch("/api/v1/profiles/me")
      .set("Authorization", authHeader(USER_A))
      .send({ bio: "Updated bio" });

    expect(response.status).toBe(200);
    expect(response.body.bio).toBe("Updated bio");
  });

  /**
   * The most important test in this file: an unexpected key in the body must
   * be rejected outright, never written.
   */
  it("rejects unknown fields instead of writing them", async () => {
    const { app, state } = buildTestApp({ seed: baseSeed() });

    const response = await request(app)
      .patch("/api/v1/profiles/me")
      .set("Authorization", authHeader(USER_A))
      .send({ bio: "hi", id: "99999999-9999-9999-9999-999999999999" });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe("validation_failed");
    // and nothing was written
    expect(state.profiles[0]!.id).toBe(USER_A);
    expect(state.profiles[0]!.bio).toBe("");
  });

  it("rejects a bio over the length limit", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app)
      .patch("/api/v1/profiles/me")
      .set("Authorization", authHeader(USER_A))
      .send({ bio: "x".repeat(161) });

    expect(response.status).toBe(422);
    expect(response.body.error.details).toHaveProperty("bio");
  });

  it("returns 409 when the requested username is taken", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app)
      .patch("/api/v1/profiles/me")
      .set("Authorization", authHeader(USER_A))
      .send({ username: "frienduser" });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("username_taken");
  });

  it("allows a user to keep their own username", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app)
      .patch("/api/v1/profiles/me")
      .set("Authorization", authHeader(USER_A))
      .send({ username: "devuser" });

    expect(response.status).toBe(200);
  });

  it("looks a profile up by username without authentication", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app).get("/api/v1/profiles/devuser");

    expect(response.status).toBe(200);
    expect(response.body.username).toBe("devuser");
  });

  it("returns 404 for an unknown username", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app).get("/api/v1/profiles/nobody");

    expect(response.status).toBe(404);
  });

  it("reports username availability", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const taken = await request(app).get(
      "/api/v1/profiles/check-username?username=devuser",
    );
    const free = await request(app).get(
      "/api/v1/profiles/check-username?username=brandnew",
    );

    expect(taken.body).toEqual({ available: false });
    expect(free.body).toEqual({ available: true });
  });
});

describe("closing an account", () => {
  const seedWithEverything = () => ({
    ...baseSeed(),
    gameLogs: [buildGameLog({ id: 1, user_id: USER_A, game_id: 1 })],
    reviews: [buildReview({ id: 1, user_id: USER_A, game_id: 1 })],
    friendships: [
      buildFriendship({ user_a_id: USER_A, user_b_id: USER_B }),
    ],
  });

  it("takes the logs, reviews and friendships with it", async () => {
    const { app, state } = buildTestApp({ seed: seedWithEverything() });

    const response = await request(app)
      .delete("/api/v1/profiles/me")
      .set("Authorization", authHeader(USER_A));

    expect(response.status).toBe(204);
    expect(state.profiles.find((p) => p.id === USER_A)).toBeUndefined();
    expect(state.gameLogs).toHaveLength(0);
    expect(state.reviews).toHaveLength(0);
    expect(state.friendships).toHaveLength(0);
  });

  it("leaves everyone else alone", async () => {
    const { app, state } = buildTestApp({ seed: seedWithEverything() });

    await request(app)
      .delete("/api/v1/profiles/me")
      .set("Authorization", authHeader(USER_A));

    expect(state.profiles.find((p) => p.id === USER_B)).toBeDefined();
  });

  it("requires authentication", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });
    expect((await request(app).delete("/api/v1/profiles/me")).status).toBe(401);
  });

  it("404s when the profile is already gone", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app)
      .delete("/api/v1/profiles/me")
      .set("Authorization", authHeader("00000000-0000-0000-0000-00000000dead"));

    expect(response.status).toBe(404);
  });
});
