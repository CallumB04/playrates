import { describe, expect, it } from "vitest";
import request from "supertest";
import {
  authHeader,
  buildTestApp,
  USER_A,
  USER_B,
} from "../helpers/buildTestApp.js";
import { baseSeed, buildGameLog, buildReview } from "../helpers/fixtures.js";

describe("reviews", () => {
  /** The whole write path is new: the old API had only GET routes. */
  it("creates a review and returns 201", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app)
      .put("/api/v1/me/reviews/1")
      .set("Authorization", authHeader(USER_A))
      .send({ body: "A genuinely great game." });

    expect(response.status).toBe(201);
    expect(response.body.body).toBe("A genuinely great game.");
    expect(response.body.isPublic).toBe(true);
  });

  it("updates an existing review rather than creating a second", async () => {
    const { app, state } = buildTestApp({
      seed: { ...baseSeed(), reviews: [buildReview()] },
    });

    const response = await request(app)
      .put("/api/v1/me/reviews/1")
      .set("Authorization", authHeader(USER_A))
      .send({ body: "Revised opinion." });

    expect(response.status).toBe(200);
    expect(state.reviews).toHaveLength(1);
    expect(state.reviews[0]!.body).toBe("Revised opinion.");
  });

  it("rejects an empty review", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app)
      .put("/api/v1/me/reviews/1")
      .set("Authorization", authHeader(USER_A))
      .send({ body: "   " });

    expect(response.status).toBe(422);
  });

  it("rejects a review over the length limit", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app)
      .put("/api/v1/me/reviews/1")
      .set("Authorization", authHeader(USER_A))
      .send({ body: "x".repeat(5001) });

    expect(response.status).toBe(422);
  });

  it("requires authentication to write", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app)
      .put("/api/v1/me/reviews/1")
      .send({ body: "anonymous" });

    expect(response.status).toBe(401);
  });

  /**
   * The `public` flag existed in the old data but was never checked, so
   * every private review was served to everyone.
   */
  it("hides a private review from anonymous viewers", async () => {
    const { app } = buildTestApp({
      seed: { ...baseSeed(), reviews: [buildReview({ is_public: false })] },
    });

    const response = await request(app).get("/api/v1/games/1/reviews");

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(0);
  });

  it("hides a private review from other users", async () => {
    const { app } = buildTestApp({
      seed: { ...baseSeed(), reviews: [buildReview({ is_public: false })] },
    });

    const response = await request(app)
      .get("/api/v1/games/1/reviews")
      .set("Authorization", authHeader(USER_B));

    expect(response.body.data).toHaveLength(0);
  });

  it("shows a private review to its author", async () => {
    const { app } = buildTestApp({
      seed: { ...baseSeed(), reviews: [buildReview({ is_public: false })] },
    });

    const response = await request(app)
      .get("/api/v1/games/1/reviews")
      .set("Authorization", authHeader(USER_A));

    expect(response.body.data).toHaveLength(1);
  });

  it("hides private reviews on a user's public profile feed", async () => {
    const { app } = buildTestApp({
      seed: { ...baseSeed(), reviews: [buildReview({ is_public: false })] },
    });

    const response = await request(app).get("/api/v1/users/devuser/reviews");

    expect(response.body.data).toHaveLength(0);
  });

  it("joins the author's rating and platform onto the review", async () => {
    const { app } = buildTestApp({
      seed: {
        ...baseSeed(),
        gameLogs: [buildGameLog()],
        reviews: [buildReview()],
      },
    });

    const response = await request(app).get("/api/v1/games/1/reviews");

    expect(response.body.data[0].rating).toBe(9.25);
    expect(response.body.data[0].platform).toBe("steam");
    expect(response.body.data[0].author.username).toBe("devuser");
  });

  it("returns a null rating when the author has no log of the game", async () => {
    const { app } = buildTestApp({
      seed: { ...baseSeed(), reviews: [buildReview()] },
    });

    const response = await request(app).get("/api/v1/games/1/reviews");

    expect(response.body.data[0].rating).toBeNull();
  });

  it("deletes with a 204 and an empty body", async () => {
    const { app, state } = buildTestApp({
      seed: { ...baseSeed(), reviews: [buildReview()] },
    });

    const response = await request(app)
      .delete("/api/v1/me/reviews/1")
      .set("Authorization", authHeader(USER_A));

    expect(response.status).toBe(204);
    expect(response.text).toBe("");
    expect(state.reviews).toHaveLength(0);
  });

  it("returns 404 when deleting a review the caller does not own", async () => {
    const { app, state } = buildTestApp({
      seed: { ...baseSeed(), reviews: [buildReview({ user_id: USER_B })] },
    });

    const response = await request(app)
      .delete("/api/v1/me/reviews/1")
      .set("Authorization", authHeader(USER_A));

    expect(response.status).toBe(404);
    expect(state.reviews).toHaveLength(1);
  });

  it("returns 404 when reviewing a game that does not exist", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app)
      .put("/api/v1/me/reviews/999")
      .set("Authorization", authHeader(USER_A))
      .send({ body: "ghost game" });

    expect(response.status).toBe(404);
  });
});
