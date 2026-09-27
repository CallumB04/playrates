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
  buildMessage,
  buildProfile,
  buildReview,
  buildThread,
} from "../helpers/fixtures.js";

const ADMIN = "33333333-3333-3333-3333-333333333333";

/** A's review and A's thread, with B's reply in it. */
const seed = () => {
  const base = baseSeed();
  return {
    ...base,
    profiles: [
      ...base.profiles,
      buildProfile({ id: ADMIN, username: "admin", is_admin: true }),
    ],
    reviews: [buildReview({ id: 1, user_id: USER_A, game_id: 1 })],
    communityThreads: [buildThread({ id: 1, author_id: USER_A })],
    communityMessages: [
      buildMessage({ id: 1, is_opening: true, author_id: USER_A }),
      buildMessage({ id: 2, author_id: USER_B }),
    ],
  };
};

const report = (app: Express, as: string, body: object) =>
  request(app)
    .post("/api/v1/reports")
    .set("Authorization", authHeader(as))
    .send(body);

describe("reporting", () => {
  it("files a report on someone else's review", async () => {
    const { app, state } = buildTestApp({ seed: seed() });

    const response = await report(app, USER_B, {
      targetType: "review",
      targetId: "1",
      reason: "spam",
      details: "  Link to a gold-selling site  ",
    });

    expect(response.status).toBe(201);
    expect(state.contentReports).toMatchObject([
      {
        reporter_id: USER_B,
        target_type: "review",
        target_id: "1",
        reason: "spam",
        details: "Link to a gold-selling site",
        status: "open",
      },
    ]);
  });

  it("refuses a report on something that isn't there", async () => {
    const { app } = buildTestApp({ seed: seed() });

    for (const [targetType, targetId] of [
      ["review", "999"],
      ["message", "abc"],
      ["profile", "not-a-uuid"],
    ]) {
      const response = await report(app, USER_B, {
        targetType,
        targetId,
        reason: "spam",
      });
      expect(response.status, `${targetType} ${targetId}`).toBe(404);
    }
  });

  it("refuses a report on your own post", async () => {
    const { app } = buildTestApp({ seed: seed() });

    const response = await report(app, USER_B, {
      targetType: "message",
      targetId: "2",
      reason: "other",
    });

    expect(response.status).toBe(422);
  });

  it("takes one open report per person per thing", async () => {
    const { app, state } = buildTestApp({ seed: seed() });
    const body = { targetType: "thread", targetId: "1", reason: "hate" };

    await report(app, USER_B, body);
    const again = await report(app, USER_B, body);

    expect(again.status).toBe(409);
    expect(state.contentReports).toHaveLength(1);
  });

  it("requires a session", async () => {
    const { app } = buildTestApp({ seed: seed() });

    const response = await request(app)
      .post("/api/v1/reports")
      .send({ targetType: "review", targetId: "1", reason: "spam" });

    expect(response.status).toBe(401);
  });

  it("refuses a reason that isn't on the list", async () => {
    const { app } = buildTestApp({ seed: seed() });

    const response = await report(app, USER_B, {
      targetType: "review",
      targetId: "1",
      reason: "cringe",
    });

    expect(response.status).toBe(422);
  });
});

describe("the admin report queue", () => {
  const withReports = async () => {
    const built = buildTestApp({ seed: seed() });
    await report(built.app, USER_B, {
      targetType: "review",
      targetId: "1",
      reason: "harassment",
    });
    await report(built.app, ADMIN, {
      targetType: "review",
      targetId: "1",
      reason: "spam",
    });
    return built;
  };

  it("lists open reports with what they point at", async () => {
    const { app } = await withReports();

    const response = await request(app)
      .get("/api/v1/admin/reports")
      .set("Authorization", authHeader(ADMIN));

    expect(response.status).toBe(200);
    expect(response.body.meta.total).toBe(2);
    expect(response.body.data[0]).toMatchObject({
      targetType: "review",
      reason: "harassment",
      reporter: { username: "frienduser" },
      target: { href: "/game/1#review-1", author: "devuser" },
      otherReports: 1,
    });
  });

  it("is not there for anyone else", async () => {
    const { app } = await withReports();

    const response = await request(app)
      .get("/api/v1/admin/reports")
      .set("Authorization", authHeader(USER_B));

    expect(response.status).toBe(404);
  });

  it("dismisses one report and leaves the post alone", async () => {
    const { app, state } = await withReports();

    const response = await request(app)
      .patch("/api/v1/admin/reports/1")
      .set("Authorization", authHeader(ADMIN))
      .send({ status: "dismissed" });

    expect(response.status).toBe(200);
    expect(state.contentReports.map((r) => r.status)).toEqual([
      "dismissed",
      "open",
    ]);
    expect(state.reviews).toHaveLength(1);
  });

  it("removes the post and closes every report about it", async () => {
    const { app, state } = await withReports();

    const response = await request(app)
      .patch("/api/v1/admin/reports/1")
      .set("Authorization", authHeader(ADMIN))
      .send({ status: "resolved", removeContent: true });

    expect(response.status).toBe(200);
    expect(response.body.target).toBeNull();
    expect(state.reviews).toHaveLength(0);
    expect(state.contentReports.map((r) => r.status)).toEqual([
      "resolved",
      "resolved",
    ]);
  });

  it("empties a reported profile rather than deleting it", async () => {
    const { app, state } = buildTestApp({
      seed: {
        ...seed(),
        profiles: seed().profiles.map((p) =>
          p.id === USER_A ? { ...p, bio: "something vile" } : p,
        ),
      },
    });
    await report(app, USER_B, {
      targetType: "profile",
      targetId: USER_A,
      reason: "hate",
    });

    await request(app)
      .patch("/api/v1/admin/reports/1")
      .set("Authorization", authHeader(ADMIN))
      .send({ status: "resolved", removeContent: true });

    const profile = state.profiles.find((p) => p.id === USER_A);
    expect(profile?.bio).toBe("");
    expect(profile?.avatar_url).toBeNull();
  });
});
