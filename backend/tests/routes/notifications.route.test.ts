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
  buildNotification,
} from "../helpers/fixtures.js";

const friendRequest = (overrides = {}) =>
  buildNotification({
    id: 2,
    user_id: USER_B,
    kind: "friend_request",
    actor_id: USER_A,
    dedupe_key: `friend_request:${USER_A}`,
    ...overrides,
  });

describe("notifications", () => {
  it("lists the caller's unarchived notifications with an unread count", async () => {
    const { app } = buildTestApp({
      seed: { ...baseSeed(), notifications: [buildNotification()] },
    });

    const response = await request(app)
      .get("/api/v1/me/notifications")
      .set("Authorization", authHeader(USER_A));

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].kind).toBe("welcome");
    expect(response.body.unread).toBe(1);
  });

  it("does not hand one user another's notifications", async () => {
    const { app } = buildTestApp({
      seed: { ...baseSeed(), notifications: [buildNotification()] },
    });

    const response = await request(app)
      .get("/api/v1/me/notifications")
      .set("Authorization", authHeader(USER_B));

    expect(response.body.data).toEqual([]);
    expect(response.body.unread).toBe(0);
  });

  it("requires a signed-in caller", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app).get("/api/v1/me/notifications");

    expect(response.status).toBe(401);
  });

  it("keeps archived notifications out of the default list", async () => {
    const { app } = buildTestApp({
      seed: {
        ...baseSeed(),
        notifications: [
          buildNotification({ archived_at: new Date().toISOString() }),
        ],
      },
    });

    const inbox = await request(app)
      .get("/api/v1/me/notifications")
      .set("Authorization", authHeader(USER_A));
    const archive = await request(app)
      .get("/api/v1/me/notifications?archived=true")
      .set("Authorization", authHeader(USER_A));

    expect(inbox.body.data).toEqual([]);
    expect(archive.body.data).toHaveLength(1);
  });

  /* An archived notification is still read, so the badge never counts rows
     the user can no longer see. */
  it("excludes archived rows from the unread count", async () => {
    const { app } = buildTestApp({
      seed: {
        ...baseSeed(),
        notifications: [
          buildNotification({ archived_at: new Date().toISOString() }),
        ],
      },
    });

    const response = await request(app)
      .get("/api/v1/me/notifications?archived=true")
      .set("Authorization", authHeader(USER_A));

    expect(response.body.unread).toBe(0);
  });

  it("marks one read, and back to unread again", async () => {
    const { app, state } = buildTestApp({
      seed: { ...baseSeed(), notifications: [buildNotification()] },
    });

    const read = await request(app)
      .patch("/api/v1/me/notifications/1")
      .set("Authorization", authHeader(USER_A))
      .send({ read: true });

    expect(read.status).toBe(200);
    expect(read.body.readAt).not.toBeNull();

    const unread = await request(app)
      .patch("/api/v1/me/notifications/1")
      .set("Authorization", authHeader(USER_A))
      .send({ read: false });

    expect(unread.body.readAt).toBeNull();
    expect(state.notifications[0]!.read_at).toBeNull();
  });

  it("reads a notification as it archives it", async () => {
    const { app, state } = buildTestApp({
      seed: { ...baseSeed(), notifications: [buildNotification()] },
    });

    const response = await request(app)
      .patch("/api/v1/me/notifications/1")
      .set("Authorization", authHeader(USER_A))
      .send({ archived: true });

    expect(response.body.archivedAt).not.toBeNull();
    expect(state.notifications[0]!.read_at).not.toBeNull();
  });

  it("rejects an empty patch", async () => {
    const { app } = buildTestApp({
      seed: { ...baseSeed(), notifications: [buildNotification()] },
    });

    const response = await request(app)
      .patch("/api/v1/me/notifications/1")
      .set("Authorization", authHeader(USER_A))
      .send({});

    expect(response.status).toBe(422);
  });

  it("will not let one user patch another's notification", async () => {
    const { app, state } = buildTestApp({
      seed: { ...baseSeed(), notifications: [buildNotification()] },
    });

    const response = await request(app)
      .patch("/api/v1/me/notifications/1")
      .set("Authorization", authHeader(USER_B))
      .send({ archived: true });

    expect(response.status).toBe(404);
    expect(state.notifications[0]!.archived_at).toBeNull();
  });

  it("marks everything read at once", async () => {
    const { app, state } = buildTestApp({
      seed: {
        ...baseSeed(),
        notifications: [
          buildNotification(),
          buildNotification({ id: 3, kind: "friend_request", dedupe_key: null }),
        ],
      },
    });

    const response = await request(app)
      .post("/api/v1/me/notifications/read-all")
      .set("Authorization", authHeader(USER_A));

    expect(response.status).toBe(204);
    expect(state.notifications.every((n) => n.read_at !== null)).toBe(true);
  });

  describe("friend requests", () => {
    it("raises one for the recipient when a request is sent", async () => {
      const { app, state } = buildTestApp({ seed: baseSeed() });

      await request(app)
        .post("/api/v1/me/friends/requests")
        .set("Authorization", authHeader(USER_A))
        .send({ userId: USER_B });

      expect(state.notifications).toHaveLength(1);
      expect(state.notifications[0]).toMatchObject({
        user_id: USER_B,
        kind: "friend_request",
        actor_id: USER_A,
      });
    });

    it("embeds the actor and the live relation", async () => {
      const { app } = buildTestApp({
        seed: {
          ...baseSeed(),
          friendships: [buildFriendship()],
          notifications: [friendRequest()],
        },
      });

      const response = await request(app)
        .get("/api/v1/me/notifications")
        .set("Authorization", authHeader(USER_B));

      expect(response.body.data[0]).toMatchObject({
        kind: "friend_request",
        relation: "request-received",
      });
      expect(response.body.data[0].actor.username).toBe("devuser");
    });

    /* The relation is read live rather than copied at send time — otherwise
       accepting on the profile page leaves the inbox offering Accept. */
    it("reports the relation as friend once the request is accepted", async () => {
      const { app } = buildTestApp({
        seed: {
          ...baseSeed(),
          friendships: [buildFriendship({ status: "accepted" })],
          notifications: [friendRequest()],
        },
      });

      const response = await request(app)
        .get("/api/v1/me/notifications")
        .set("Authorization", authHeader(USER_B));

      expect(response.body.data[0].relation).toBe("friend");
    });

    it("reports no relation once the request is gone", async () => {
      const { app } = buildTestApp({
        seed: { ...baseSeed(), notifications: [friendRequest()] },
      });

      const response = await request(app)
        .get("/api/v1/me/notifications")
        .set("Authorization", authHeader(USER_B));

      expect(response.body.data[0].relation).toBeNull();
    });

    it("reads the notification when the request is accepted", async () => {
      const { app, state } = buildTestApp({
        seed: {
          ...baseSeed(),
          friendships: [buildFriendship()],
          notifications: [friendRequest()],
        },
      });

      await request(app)
        .post(`/api/v1/me/friends/${USER_A}/accept`)
        .set("Authorization", authHeader(USER_B));

      expect(state.notifications[0]!.read_at).not.toBeNull();
    });

    it("reads the notification when the request is declined", async () => {
      const { app, state } = buildTestApp({
        seed: {
          ...baseSeed(),
          friendships: [buildFriendship()],
          notifications: [friendRequest()],
        },
      });

      await request(app)
        .delete(`/api/v1/me/friends/${USER_A}`)
        .set("Authorization", authHeader(USER_B));

      expect(state.notifications[0]!.read_at).not.toBeNull();
    });

    /* Re-sending after a decline must resurface the row the recipient already
       has, not stack a second one under the same dedupe key. */
    it("resurfaces an archived request instead of adding another", async () => {
      const { app, state } = buildTestApp({
        seed: {
          ...baseSeed(),
          notifications: [
            friendRequest({
              read_at: new Date().toISOString(),
              archived_at: new Date().toISOString(),
            }),
          ],
        },
      });

      await request(app)
        .post("/api/v1/me/friends/requests")
        .set("Authorization", authHeader(USER_A))
        .send({ userId: USER_B });

      expect(state.notifications).toHaveLength(1);
      expect(state.notifications[0]!.read_at).toBeNull();
      expect(state.notifications[0]!.archived_at).toBeNull();
    });
  });
});
