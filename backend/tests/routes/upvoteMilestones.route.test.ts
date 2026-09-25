import { describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import {
  authHeader,
  buildTestApp,
  USER_A,
  USER_B,
} from "../helpers/buildTestApp.js";
import {
  baseSeed,
  buildGameLog,
  buildMessage,
  buildProfile,
  buildReview,
  buildThread,
  doc,
} from "../helpers/fixtures.js";

/** Stand-in voters: the vote tables need no profile behind them here. */
const voters = (n: number, from = 0) =>
  Array.from(
    { length: n },
    (_, i) => `00000000-0000-0000-0000-${String(from + i).padStart(12, "0")}`,
  );

const seed = () => ({
  ...baseSeed(),
  communityThreads: [buildThread()],
  communityMessages: [
    buildMessage({ id: 1, is_opening: true, body: doc("First take.") }),
  ],
  gameLogs: [buildGameLog()],
  reviews: [buildReview()],
});

const voteMessage = (app: Express, as: string) =>
  request(app)
    .post("/api/v1/community/messages/1/vote")
    .set("Authorization", authHeader(as));

const voteReview = (app: Express, as: string) =>
  request(app)
    .post("/api/v1/reviews/1/vote")
    .set("Authorization", authHeader(as));

describe("upvote milestones on community messages", () => {
  const milestones = (state: ReturnType<typeof buildTestApp>["state"]) =>
    state.notifications.filter((n) => n.kind === "community_upvote_milestone");

  it("says nothing until the fifth upvote, then tells the author", async () => {
    const { app, state } = buildTestApp({ seed: seed() });

    for (const voter of voters(4)) await voteMessage(app, voter);
    expect(milestones(state)).toHaveLength(0);

    await voteMessage(app, USER_B);

    expect(milestones(state)).toHaveLength(1);
    expect(milestones(state)[0]).toMatchObject({
      user_id: USER_A,
      read_at: null,
      data: {
        milestone: 5,
        threadId: 1,
        threadTitle: "Best side quest?",
        messageId: 1,
        excerpt: "First take.",
      },
    });
  });

  it("does not announce a milestone twice when a vote is taken back and given again", async () => {
    const { app, state } = buildTestApp({ seed: seed() });
    for (const voter of voters(5)) await voteMessage(app, voter);
    const [note] = milestones(state);
    note!.read_at = "2026-01-02T00:00:00.000Z";

    await voteMessage(app, voters(5)[4]!); // back to 4
    await voteMessage(app, voters(5)[4]!); // 5 again

    expect(milestones(state)).toHaveLength(1);
    expect(milestones(state)[0]!.read_at).toBe("2026-01-02T00:00:00.000Z");
  });

  it("moves the one notification up at the next milestone", async () => {
    const { app, state } = buildTestApp({ seed: seed() });
    for (const voter of voters(5)) await voteMessage(app, voter);
    milestones(state)[0]!.read_at = "2026-01-02T00:00:00.000Z";

    for (const voter of voters(5, 5)) await voteMessage(app, voter);

    expect(milestones(state)).toHaveLength(1);
    expect(milestones(state)[0]).toMatchObject({
      read_at: null,
      data: { milestone: 10 },
    });
  });

  it("goes when the message does", async () => {
    const base = seed();
    const { app, state } = buildTestApp({
      seed: {
        ...base,
        profiles: [
          ...base.profiles,
          buildProfile({
            id: "33333333-3333-3333-3333-333333333333",
            username: "admin",
            is_admin: true,
          }),
        ],
        communityMessages: [
          ...base.communityMessages,
          buildMessage({ id: 2, author_id: USER_B }),
        ],
      },
    });
    for (const voter of voters(5)) {
      await request(app)
        .post("/api/v1/community/messages/2/vote")
        .set("Authorization", authHeader(voter));
    }
    expect(milestones(state)).toHaveLength(1);

    await request(app)
      .delete("/api/v1/community/messages/2")
      .set("Authorization", authHeader(USER_B));

    expect(milestones(state)).toHaveLength(0);
  });

  it("reads back as a notification", async () => {
    const { app } = buildTestApp({ seed: seed() });
    for (const voter of voters(5)) await voteMessage(app, voter);

    const inbox = await request(app)
      .get("/api/v1/me/notifications")
      .set("Authorization", authHeader(USER_A));

    expect(inbox.body.data[0]).toMatchObject({
      kind: "community_upvote_milestone",
      milestone: 5,
      messageId: 1,
    });
  });
});

describe("upvote milestones on reviews", () => {
  const milestones = (state: ReturnType<typeof buildTestApp>["state"]) =>
    state.notifications.filter((n) => n.kind === "review_upvote_milestone");

  it("tells the reviewer at five, with the game", async () => {
    const { app, state } = buildTestApp({ seed: seed() });

    for (const voter of voters(5)) await voteReview(app, voter);

    expect(milestones(state)[0]).toMatchObject({
      user_id: USER_A,
      data: {
        milestone: 5,
        reviewId: 1,
        gameId: 1,
        gameTitle: "The Witcher 3: Wild Hunt",
      },
    });
  });

  it("goes when the review does, including with its log", async () => {
    const { app, state } = buildTestApp({ seed: seed() });
    for (const voter of voters(5)) await voteReview(app, voter);
    expect(milestones(state)).toHaveLength(1);

    await request(app)
      .delete("/api/v1/me/game-logs/1")
      .set("Authorization", authHeader(USER_A));

    expect(milestones(state)).toHaveLength(0);
  });
});
