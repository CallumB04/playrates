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
  it("creates a review and returns 201", async () => {
    const { app } = buildTestApp({
      seed: { ...baseSeed(), gameLogs: [buildGameLog()] },
    });

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
      seed: {
        ...baseSeed(),
        gameLogs: [buildGameLog()],
        reviews: [buildReview()],
      },
    });

    const response = await request(app)
      .put("/api/v1/me/reviews/1")
      .set("Authorization", authHeader(USER_A))
      .send({ body: "Revised opinion." });

    expect(response.status).toBe(200);
    expect(state.reviews).toHaveLength(1);
    expect(state.reviews[0]!.body).toBe("Revised opinion.");
  });

  it("refuses a review of a game you have not logged", async () => {
    const { app, state } = buildTestApp({ seed: baseSeed() });

    const response = await request(app)
      .put("/api/v1/me/reviews/1")
      .set("Authorization", authHeader(USER_A))
      .send({ body: "Never played it, but." });

    expect(response.status).toBe(422);
    expect(state.reviews).toHaveLength(0);
  });

  it("goes when the log it was written from is deleted", async () => {
    const { app, state } = buildTestApp({
      seed: {
        ...baseSeed(),
        gameLogs: [buildGameLog()],
        reviews: [buildReview(), buildReview({ id: 2, user_id: USER_B })],
      },
    });

    const response = await request(app)
      .delete("/api/v1/me/game-logs/1")
      .set("Authorization", authHeader(USER_A));

    expect(response.status).toBe(204);
    // someone else's review of the same game stays
    expect(state.reviews.map((r) => r.id)).toEqual([2]);
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

  /** A private review must never reach anyone but its author. */
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

describe("review sorting", () => {
  /* The rating lives on the author's game_logs row, not on the review — so
     this is really checking the join happens before pagination. */
  const seedWithRatings = () => ({
    ...baseSeed(),
    reviews: [
      buildReview({ id: 1, user_id: USER_A, game_id: 1, body: "mid" }),
      buildReview({ id: 2, user_id: USER_B, game_id: 1, body: "loved it" }),
    ],
    gameLogs: [
      buildGameLog({ id: 1, user_id: USER_A, game_id: 1, rating: 5 }),
      buildGameLog({ id: 2, user_id: USER_B, game_id: 1, rating: 9.5 }),
    ],
  });

  it("orders by the author's rating, highest first", async () => {
    const { app } = buildTestApp({ seed: seedWithRatings() });

    const response = await request(app).get(
      "/api/v1/games/1/reviews?sort=rating-high",
    );

    expect(response.status).toBe(200);
    expect(response.body.data.map((r: { rating: number }) => r.rating)).toEqual(
      [9.5, 5],
    );
  });

  it("orders lowest first on request", async () => {
    const { app } = buildTestApp({ seed: seedWithRatings() });

    const response = await request(app).get(
      "/api/v1/games/1/reviews?sort=rating-low",
    );

    expect(response.body.data.map((r: { rating: number }) => r.rating)).toEqual(
      [5, 9.5],
    );
  });

  it("sorts unrated reviews last in both directions", async () => {
    const seed = {
      ...baseSeed(),
      reviews: [
        buildReview({ id: 1, user_id: USER_A, game_id: 1, body: "no log" }),
        buildReview({ id: 2, user_id: USER_B, game_id: 1, body: "rated" }),
      ],
      // Only USER_B has a log, so USER_A's review has no rating at all.
      gameLogs: [
        buildGameLog({ id: 2, user_id: USER_B, game_id: 1, rating: 7 }),
      ],
    };

    for (const sort of ["rating-high", "rating-low"]) {
      const { app } = buildTestApp({ seed });
      const response = await request(app).get(
        `/api/v1/games/1/reviews?sort=${sort}`,
      );
      expect(
        response.body.data.map((r: { rating: number | null }) => r.rating),
        sort,
      ).toEqual([7, null]);
    }
  });

  it("rejects a sort it does not know", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });
    expect(
      (await request(app).get("/api/v1/games/1/reviews?sort=vibes")).status,
    ).toBe(422);
  });
});

describe("reviews feed", () => {
  it("lists public reviews across every game, newest first", async () => {
    const { app } = buildTestApp({
      seed: {
        ...baseSeed(),
        reviews: [
          buildReview({
            id: 1,
            body: "older",
            created_at: "2026-01-01T00:00:00.000Z",
          }),
          buildReview({
            id: 2,
            user_id: USER_B,
            body: "newer",
            created_at: "2026-02-01T00:00:00.000Z",
          }),
        ],
      },
    });

    const response = await request(app).get("/api/v1/reviews");

    expect(response.status).toBe(200);
    expect(response.body.data.map((r: { body: string }) => r.body)).toEqual([
      "newer",
      "older",
    ]);
  });

  /* The feed is public, so a private review must not leak into it even
     though its author can see it on their own profile. */
  it("leaves private reviews out", async () => {
    const { app } = buildTestApp({
      seed: {
        ...baseSeed(),
        reviews: [buildReview({ id: 1, is_public: false })],
      },
    });

    const response = await request(app).get("/api/v1/reviews");
    expect(response.body.data).toHaveLength(0);
  });

  it("carries the game and the hours behind the rating", async () => {
    const { app } = buildTestApp({
      seed: {
        ...baseSeed(),
        gameLogs: [buildGameLog({ rating: 9, hours_played: 41 })],
        reviews: [buildReview({ id: 1 })],
      },
    });

    const response = await request(app).get("/api/v1/reviews");
    const [review] = response.body.data;

    expect(review.game.title).toBeTruthy();
    expect(review.rating).toBe(9);
    expect(review.hoursPlayed).toBe(41);
  });
});

describe("upvoting a review", () => {
  // USER_A wrote it, so USER_B is the one who can vote.
  const seed = () => ({ ...baseSeed(), reviews: [buildReview()] });

  it("counts someone else's vote", async () => {
    const { app, state } = buildTestApp({ seed: seed() });

    const response = await request(app)
      .post("/api/v1/reviews/1/vote")
      .set("Authorization", authHeader(USER_B));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ voteCount: 1, votedByViewer: true });
    expect(state.reviewVotes).toHaveLength(1);
  });

  it("withdraws the vote when pressed again", async () => {
    const { app } = buildTestApp({ seed: seed() });
    const vote = () =>
      request(app)
        .post("/api/v1/reviews/1/vote")
        .set("Authorization", authHeader(USER_B));

    await vote();
    const response = await vote();

    expect(response.body).toEqual({ voteCount: 0, votedByViewer: false });
  });

  it("refuses a vote on your own review", async () => {
    const { app, state } = buildTestApp({ seed: seed() });

    const response = await request(app)
      .post("/api/v1/reviews/1/vote")
      .set("Authorization", authHeader(USER_A));

    expect(response.status).toBe(403);
    expect(state.reviewVotes).toHaveLength(0);
  });

  it("requires a signed-in caller", async () => {
    const { app } = buildTestApp({ seed: seed() });

    const response = await request(app).post("/api/v1/reviews/1/vote");

    expect(response.status).toBe(401);
  });
});
