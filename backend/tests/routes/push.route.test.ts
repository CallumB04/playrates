import { describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import {
  authHeader,
  buildTestApp,
  createPushRecorder,
  USER_A,
  USER_B,
} from "../helpers/buildTestApp.js";
import {
  baseSeed,
  buildGame,
  buildMessage,
  buildProfile,
  buildThread,
  doc,
} from "../helpers/fixtures.js";

const device = (endpoint = "https://push.example/device-1") => ({
  endpoint,
  keys: { p256dh: "p256dh-key", auth: "auth-key" },
});

const subscribe = (app: Express, as: string, body = device()) =>
  request(app)
    .post("/api/v1/me/push")
    .set("Authorization", authHeader(as))
    .send(body);

const befriend = (app: Express) =>
  request(app)
    .post("/api/v1/me/friends/requests")
    .set("Authorization", authHeader(USER_A))
    .send({ userId: USER_B });

describe("push", () => {
  it("gives the key to subscribe with, or none when it isn't set up", async () => {
    const off = buildTestApp({ seed: baseSeed() });
    expect((await request(off.app).get("/api/v1/push/key")).body).toEqual({
      publicKey: null,
    });
    const on = buildTestApp({
      seed: baseSeed(),
      push: createPushRecorder().sender,
    });
    expect((await request(on.app).get("/api/v1/push/key")).body).toEqual({
      publicKey: "test-public-key",
    });
  });

  it("pushes a friend request to the devices that said yes", async () => {
    const recorder = createPushRecorder();
    const { app, email } = buildTestApp({
      seed: baseSeed(),
      push: recorder.sender,
    });

    expect((await subscribe(app, USER_B)).status).toBe(204);
    await befriend(app);
    await email.flush();

    expect(recorder.sent).toEqual([
      {
        endpoint: "https://push.example/device-1",
        payload: expect.objectContaining({
          title: "Friend request",
          body: "devuser sent you a friend request",
        }),
      },
    ]);
  });

  it("forgets a device its push service has forgotten", async () => {
    const recorder = createPushRecorder();
    const { app, state, email } = buildTestApp({
      seed: baseSeed(),
      push: recorder.sender,
    });
    await subscribe(app, USER_B, device("https://push.example/gone"));
    await befriend(app);
    await email.flush();
    expect(state.pushSubscriptions).toEqual([]);
  });

  it("stops when the device is turned off", async () => {
    const recorder = createPushRecorder();
    const { app, email } = buildTestApp({
      seed: baseSeed(),
      push: recorder.sender,
    });
    await subscribe(app, USER_B);
    await request(app)
      .post("/api/v1/me/push/remove")
      .set("Authorization", authHeader(USER_B))
      .send({ endpoint: device().endpoint });
    await befriend(app);
    await email.flush();
    expect(recorder.sent).toEqual([]);
  });

  it("moves a browser to whoever signed in on it last", async () => {
    const { app, state } = buildTestApp({
      seed: baseSeed(),
      push: createPushRecorder().sender,
    });
    await subscribe(app, USER_A);
    await subscribe(app, USER_B);
    expect(state.pushSubscriptions.map((p) => p.userId)).toEqual([USER_B]);
  });

  it("refuses a subscription that isn't to an https push service", async () => {
    const { app } = buildTestApp({
      seed: baseSeed(),
      push: createPushRecorder().sender,
    });
    expect(
      (await subscribe(app, USER_A, device("http://evil.example/x"))).status,
    ).toBe(422);
  });

  it("takes no subscriptions while push isn't set up", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });
    expect((await subscribe(app, USER_A)).status).toBe(404);
  });

  it("pushes a reply about an adult game only to someone who chose to see them", async () => {
    const replyFor = async (optedIn: boolean) => {
      const recorder = createPushRecorder();
      const base = baseSeed();
      const { app, email } = buildTestApp({
        seed: {
          ...base,
          games: [buildGame({ id: 1, has_sexual_content: true })],
          communityThreads: [buildThread()],
          communityMessages: [buildMessage({ id: 1, is_opening: true })],
          profiles: base.profiles.map((p) => ({
            ...p,
            show_sexual_content: p.id === USER_B || optedIn,
          })),
        },
        push: recorder.sender,
      });
      await subscribe(app, USER_A);
      await request(app)
        .post("/api/v1/community/threads/1/messages")
        .set("Authorization", authHeader(USER_B))
        .send({ body: doc("Hello") });
      await email.flush();
      return recorder.sent;
    };

    expect(await replyFor(false)).toEqual([]);
    expect(await replyFor(true)).toHaveLength(1);
  });

  describe("a new member, to the admins", () => {
    // devuser is finishing signing up; frienduser runs the site.
    const seed = () => ({
      ...baseSeed(),
      profiles: [
        buildProfile({ onboarded_at: null }),
        buildProfile({ id: USER_B, username: "frienduser", is_admin: true }),
      ],
    });
    const onboard = (app: Express) =>
      request(app)
        .post("/api/v1/profiles/me/onboarded")
        .set("Authorization", authHeader(USER_A));

    it("pushes to an admin's devices when someone finishes signing up, once", async () => {
      const recorder = createPushRecorder();
      const { app, email } = buildTestApp({
        seed: seed(),
        push: recorder.sender,
      });
      await subscribe(app, USER_B);

      await onboard(app);
      // A second tab dismissing its welcome too isn't a second member.
      await onboard(app);
      await email.flush();

      expect(recorder.sent).toEqual([
        {
          endpoint: "https://push.example/device-1",
          payload: {
            title: "New member",
            body: "devuser just joined PlayRates",
            url: "/user/devuser",
            tag: "joined:devuser",
          },
        },
      ]);
    });

    it("tells nobody who isn't an admin", async () => {
      const recorder = createPushRecorder();
      const notAdmin = seed();
      notAdmin.profiles[1] = buildProfile({
        id: USER_B,
        username: "frienduser",
      });
      const { app, email } = buildTestApp({
        seed: notAdmin,
        push: recorder.sender,
      });
      await subscribe(app, USER_B);

      await onboard(app);
      await email.flush();

      expect(recorder.sent).toEqual([]);
    });
  });
});
