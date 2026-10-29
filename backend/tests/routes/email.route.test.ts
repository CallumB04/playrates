import { createHmac } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import {
  authHeader,
  buildTestApp,
  USER_A,
  USER_B,
} from "../helpers/buildTestApp.js";
import { baseSeed, buildGame, buildGameLog, buildProfile } from "../helpers/fixtures.js";
import { emailOf, TEST_EMAIL_SETTINGS } from "../helpers/inMemoryEmail.js";
import { signUnsubscribeToken } from "../../src/modules/email/email.tokens.js";
import type { EmailScope } from "@playrates/shared";

const token = (scope: EmailScope, userId = USER_A) =>
  signUnsubscribeToken(TEST_EMAIL_SETTINGS.signingSecret, { userId, scope });

describe("unsubscribe links", () => {
  it("says which switch a link is for and whether it's on", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });
    const response = await request(app).get(`/api/v1/email/unsubscribe/${token("replies")}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ scope: "replies", label: "Replies to you", on: true });
  });

  it("refuses a link that isn't ours", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });
    const forged = signUnsubscribeToken("not-our-secret", { userId: USER_A, scope: "news" });
    const response = await request(app).get(`/api/v1/email/unsubscribe/${forged}`);
    expect(response.status).toBe(400);
  });

  it("turns it off in one click, as a mail app posts it", async () => {
    const { app, state } = buildTestApp({ seed: baseSeed() });
    const response = await request(app)
      .post(`/api/v1/email/unsubscribe?t=${token("friend_requests")}`)
      .type("form")
      .send("List-Unsubscribe=One-Click");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      scope: "friend_requests",
      label: "Friend requests",
      on: false,
    });
    expect(state.profiles[0]!.email_prefs).toEqual({ friend_requests: false });
  });

  it("takes the token in a JSON body, as the page sends it", async () => {
    const { app, state } = buildTestApp({ seed: baseSeed() });
    const response = await request(app)
      .post("/api/v1/email/unsubscribe")
      .send({ token: token("replies") });
    expect(response.status).toBe(200);
    expect(state.profiles[0]!.email_prefs).toEqual({ replies: false });
  });

  it("takes an empty body with the token in the query", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });
    const response = await request(app).post(`/api/v1/email/unsubscribe?t=${token("replies")}`);
    expect(response.status).toBe(200);
  });

  it("refuses an unsubscribe without a valid token", async () => {
    const { app, state } = buildTestApp({ seed: baseSeed() });
    const response = await request(app).post("/api/v1/email/unsubscribe?t=short");
    expect(response.status).toBe(400);
    expect(state.profiles[0]!.email_prefs).toEqual({});
  });

  it("turns off every email from any one link, when asked for all", async () => {
    const { app, state, email } = buildTestApp({ seed: baseSeed() });
    const response = await request(app)
      .post("/api/v1/email/unsubscribe")
      .send({ token: token("replies"), scope: "all" });
    expect(response.body).toEqual({ scope: "all", label: "PlayRates", on: false });
    expect(state.profiles[0]!.email_prefs).toEqual({ all: false });
    await email.flush();
    // All off takes them out of news too.
    expect(email.contacts.get(emailOf(USER_A))).toEqual({
      email: emailOf(USER_A),
      unsubscribed: true,
    });
  });

  it("takes all from the query too, and nothing narrower", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });
    const all = await request(app).post(`/api/v1/email/unsubscribe?t=${token("news")}&scope=all`);
    expect(all.body.scope).toBe("all");
    const other = await request(app)
      .post("/api/v1/email/unsubscribe")
      .send({ token: token("news"), scope: "replies" });
    expect(other.status).toBe(400);
  });

  it("undoes it with the same link", async () => {
    const { app, state } = buildTestApp({
      seed: { ...baseSeed(), profiles: [buildProfile({ email_prefs: { news: false } })] },
    });
    const response = await request(app)
      .post("/api/v1/email/resubscribe")
      .send({ token: token("news") });
    expect(response.body).toEqual({ scope: "news", label: "News and patch notes", on: true });
    expect(state.profiles[0]!.email_prefs).toEqual({ news: true });
  });

  it("undoes turning off all, from any link", async () => {
    const { app, state } = buildTestApp({
      seed: { ...baseSeed(), profiles: [buildProfile({ email_prefs: { all: false, replies: false } })] },
    });
    const response = await request(app)
      .post("/api/v1/email/resubscribe")
      .send({ token: token("replies"), scope: "all" });
    expect(response.body).toEqual({ scope: "all", label: "PlayRates", on: true });
    // Only all comes back: replies stays as it was set.
    expect(state.profiles[0]!.email_prefs).toEqual({ all: true, replies: false });
  });

  it("refuses an undo without a token", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });
    const response = await request(app).post("/api/v1/email/resubscribe").send({});
    expect(response.status).toBe(422);
  });
});

describe("Resend's webhook", () => {
  const key = Buffer.from("test-webhook-secret");
  const signed = (body: string, timestamp = String(Math.floor(Date.now() / 1000))) => ({
    "svix-id": "msg_1",
    "svix-timestamp": timestamp,
    "svix-signature": `v1,${createHmac("sha256", key)
      .update(`msg_1.${timestamp}.${body}`)
      .digest("base64")}`,
  });
  const event = JSON.stringify({
    type: "contact.updated",
    created_at: "2026-10-11T23:47:56.678Z",
    data: { id: "c1", email: emailOf(USER_A), unsubscribed: true },
  });

  it("turns news off for someone who left through Resend's own link", async () => {
    const { app, state } = buildTestApp({ seed: baseSeed() });
    const response = await request(app)
      .post("/api/v1/email/webhooks/resend")
      .set({ ...signed(event), "Content-Type": "application/json" })
      .send(event);
    expect(response.status).toBe(204);
    expect(state.profiles[0]!.email_prefs).toEqual({ news: false });
  });

  it("refuses a delivery with a bad signature", async () => {
    const { app, state } = buildTestApp({ seed: baseSeed() });
    const response = await request(app)
      .post("/api/v1/email/webhooks/resend")
      .set({ ...signed("{}"), "Content-Type": "application/json" })
      .send(event);
    expect(response.status).toBe(401);
    expect(state.profiles[0]!.email_prefs).toEqual({});
  });
});

describe("emails from what happens in the app", () => {
  it("emails a friend request after the response", async () => {
    const { app, email } = buildTestApp({ seed: baseSeed() });
    const response = await request(app)
      .post("/api/v1/me/friends/requests")
      .set("Authorization", authHeader(USER_A))
      .send({ userId: USER_B });
    expect(response.status).toBe(201);
    await email.flush();
    expect(email.sent).toHaveLength(1);
    expect(email.sent[0]).toMatchObject({
      to: emailOf(USER_B),
      subject: "devuser sent you a friend request",
    });
  });

  it("still answers when the email fails", async () => {
    const { app, email, state } = buildTestApp({ seed: baseSeed() });
    email.failSends = true;
    const response = await request(app)
      .post("/api/v1/me/friends/requests")
      .set("Authorization", authHeader(USER_A))
      .send({ userId: USER_B });
    await email.flush();
    expect(response.status).toBe(201);
    expect(state.notifications).toHaveLength(1);
  });

  it("sends the welcome when setting up is first done", async () => {
    const { app, email } = buildTestApp({
      seed: { ...baseSeed(), profiles: [buildProfile({ onboarded_at: null })] },
    });
    await request(app).post("/api/v1/profiles/me/onboarded").set("Authorization", authHeader(USER_A));
    await request(app).post("/api/v1/profiles/me/onboarded").set("Authorization", authHeader(USER_A));
    await email.flush();
    expect(email.sent.map((m) => m.subject)).toEqual(["Welcome to PlayRates"]);
    expect(email.contacts.get(emailOf(USER_A))?.unsubscribed).toBe(false);
  });

  it("takes a deleted account out of the news audience", async () => {
    const { app, email } = buildTestApp({ seed: baseSeed() });
    email.contacts.set(emailOf(USER_A), { email: emailOf(USER_A), unsubscribed: false });
    const response = await request(app)
      .delete("/api/v1/profiles/me")
      .set("Authorization", authHeader(USER_A));
    expect(response.status).toBe(204);
    await email.flush();
    expect(email.contacts.has(emailOf(USER_A))).toBe(false);
  });

  it("emails the day's wishlist releases from the daily job", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { app, email } = buildTestApp({
      seed: {
        ...baseSeed(),
        games: [buildGame({ id: 1, title: "Out Today", release_date: today })],
        gameLogs: [buildGameLog({ status: "wishlist" })],
      },
    });
    const response = await request(app)
      .get("/api/v1/cron/trending")
      .set("Authorization", "Bearer test-cron-secret");
    expect(response.status).toBe(200);
    expect(response.body.wishlist).toEqual({ sent: 1 });
    expect(email.sent[0]!.subject).toBe("Out Today is out today");
  });
});

describe("email settings", () => {
  it("are all on to begin with", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });
    const response = await request(app).get("/api/v1/profiles/me").set("Authorization", authHeader(USER_A));
    expect(response.body.emailPrefs).toEqual({
      all: true,
      friend_requests: true,
      replies: true,
      gifts_invites: true,
      wishlist_releases: true,
      news: true,
    });
  });

  it("change only the switches named", async () => {
    const { app, state, email } = buildTestApp({
      seed: { ...baseSeed(), profiles: [buildProfile({ email_prefs: { replies: false } })] },
    });
    const response = await request(app)
      .patch("/api/v1/profiles/me")
      .set("Authorization", authHeader(USER_A))
      .send({ emailPrefs: { friend_requests: false } });
    expect(response.status).toBe(200);
    expect(response.body.emailPrefs).toMatchObject({ replies: false, friend_requests: false, news: true });
    expect(state.profiles[0]!.email_prefs).toEqual({ replies: false, friend_requests: false });
    await email.flush();
    // Not news or all: the audience isn't touched.
    expect(email.contacts.size).toBe(0);
  });

  it("move the news audience with news", async () => {
    const { app, email } = buildTestApp({ seed: baseSeed() });
    await request(app)
      .patch("/api/v1/profiles/me")
      .set("Authorization", authHeader(USER_A))
      .send({ emailPrefs: { news: false } });
    await email.flush();
    expect(email.contacts.get(emailOf(USER_A))?.unsubscribed).toBe(true);
  });

  it("refuse a switch that doesn't exist", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });
    const response = await request(app)
      .patch("/api/v1/profiles/me")
      .set("Authorization", authHeader(USER_A))
      .send({ emailPrefs: { spam: true } });
    expect(response.status).toBe(422);
  });
});
