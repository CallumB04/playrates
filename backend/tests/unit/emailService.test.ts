import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { EMAIL_LIMITS } from "@playrates/shared";
import { createEmailService } from "../../src/modules/email/email.service.js";
import {
  groupWishlistReleases,
  planReconcile,
} from "../../src/modules/email/email.events.js";
import { readUnsubscribeToken } from "../../src/modules/email/email.tokens.js";
import { createLogger } from "../../src/lib/logger.js";
import { createInMemoryRepos } from "../helpers/inMemoryRepos.js";
import {
  createEmailFakes,
  emailOf,
  TEST_EMAIL_SETTINGS,
} from "../helpers/inMemoryEmail.js";
import { setTestEnv, USER_A, USER_B } from "../helpers/buildTestApp.js";
import { buildGame, buildGameLog, buildProfile } from "../helpers/fixtures.js";

setTestEnv();

const setup = (
  profiles = [buildProfile(), buildProfile({ id: USER_B, username: "ana" })],
  settings: Partial<typeof TEST_EMAIL_SETTINGS> = {},
) => {
  const { repos, state } = createInMemoryRepos({
    profiles,
    games: [
      buildGame({ id: 1, title: "Hades II", release_date: "2026-11-05" }),
      buildGame({ id: 2, title: "Silksong", release_date: "2026-11-05" }),
      buildGame({ id: 3, title: "Later", release_date: "2026-12-01" }),
    ],
  });
  const fakes = createEmailFakes();
  const service = createEmailService({
    repo: repos.email,
    profiles: repos.profiles,
    ...fakes.deps,
    settings: { ...TEST_EMAIL_SETTINGS, ...settings },
    logger: createLogger(),
  });
  return { service, state, email: fakes.recorder };
};

const friendRequest = {
  userId: USER_A,
  kind: "friend_request" as const,
  actorId: USER_B,
  dedupeKey: `friend_request:${USER_B}`,
};

describe("event emails", () => {
  it("emails a friend request, with a one-click unsubscribe for it", async () => {
    const { service, email } = setup();
    expect(await service.sendEvent(friendRequest)).toBe(true);

    const [sent] = email.sent;
    expect(sent!.to).toBe(emailOf(USER_A));
    expect(sent!.subject).toBe("ana sent you a friend request");
    expect(sent!.headers!["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    const token = /\?t=([^>]+)>/.exec(sent!.headers!["List-Unsubscribe"]!)![1]!;
    expect(sent!.headers!["List-Unsubscribe"]).toContain(
      `${TEST_EMAIL_SETTINGS.api}/email/unsubscribe?t=`,
    );
    expect(readUnsubscribeToken(TEST_EMAIL_SETTINGS.signingSecret, token)).toEqual({
      userId: USER_A,
      scope: "friend_requests",
    });
    expect(sent!.html).toContain(`${TEST_EMAIL_SETTINGS.site}/unsubscribe?t=${token}`);
  });

  it("sends nothing for a kind without an email", async () => {
    const { service, email } = setup();
    expect(
      await service.sendEvent({ userId: USER_A, kind: "friend_accepted", actorId: USER_B }),
    ).toBe(false);
    expect(email.sent).toHaveLength(0);
  });

  it("respects the category's switch", async () => {
    const { service, email } = setup([
      buildProfile({ email_prefs: { friend_requests: false } }),
      buildProfile({ id: USER_B, username: "ana" }),
    ]);
    expect(await service.sendEvent(friendRequest)).toBe(false);
    expect(email.sent).toHaveLength(0);
  });

  it("respects all off over a category left on", async () => {
    const { service, email } = setup([
      buildProfile({ email_prefs: { all: false, friend_requests: true } }),
      buildProfile({ id: USER_B, username: "ana" }),
    ]);
    expect(await service.sendEvent(friendRequest)).toBe(false);
    expect(email.sent).toHaveLength(0);
  });

  it("never writes to an address nobody confirmed", async () => {
    const { service, state, email } = setup();
    state.unconfirmed.add(USER_A);
    expect(await service.sendEvent(friendRequest)).toBe(false);
    expect(email.sent).toHaveLength(0);
  });

  it("sends a request raised again within the day only once", async () => {
    const { service, email } = setup();
    await service.sendEvent(friendRequest);
    await service.sendEvent(friendRequest);
    expect(email.sent).toHaveLength(1);
  });

  it("sends one again after a day", async () => {
    const { service, state, email } = setup();
    await service.sendEvent(friendRequest);
    state.emailLog[0]!.sent_at = new Date(Date.now() - 25 * 3600_000).toISOString();
    await service.sendEvent(friendRequest);
    expect(email.sent).toHaveLength(2);
  });

  it("gives the claim back when the send fails, so it can go later", async () => {
    const { service, state, email } = setup();
    email.failSends = true;
    await expect(service.sendEvent(friendRequest)).rejects.toThrow();
    expect(state.emailLog).toHaveLength(0);
    email.failSends = false;
    expect(await service.sendEvent(friendRequest)).toBe(true);
  });

  it("sends nothing it couldn't let someone stop", async () => {
    const { service, email } = setup(undefined, { signingSecret: undefined });
    expect(await service.sendEvent(friendRequest)).toBe(false);
    expect(await service.sendWelcome(USER_A)).toBe(false);
    expect(email.sent).toHaveLength(0);
  });

  it("emails a reply with the excerpt the bell has", async () => {
    const { service, email } = setup();
    await service.sendEvent({
      userId: USER_A,
      kind: "community_reply",
      actorId: USER_B,
      dedupeKey: "community_reply:9",
      data: { threadId: 3, threadTitle: "Best RPG", messageId: 9, excerpt: "Agreed [spoiler]" },
    });
    expect(email.sent[0]!.text).toContain('"Agreed [spoiler]"');
  });

  it.each([
    ["gift_received", { username: "ana", item: "frame_neon" }, "ana sent you a gift"],
    ["referral_joined", { username: "cy" }, "cy joined PlayRates from your invite"],
    ["referral_active", { username: "cy", xp: 250, tokens: 50 }, "cy got going on PlayRates"],
  ] as const)("emails a %s", async (kind, data, subject) => {
    const { service, email } = setup();
    await service.sendEvent({ userId: USER_A, kind, actorId: USER_B, data, dedupeKey: `${kind}:1` });
    expect(email.sent[0]!.subject).toBe(subject);
  });

  it("names the actor from their profile when the data doesn't", async () => {
    const { service, email } = setup();
    await service.sendEvent({ userId: USER_A, kind: "referral_joined", actorId: USER_B, data: {} });
    expect(email.sent[0]!.text).toContain("300 XP and 50 tokens");
    expect(email.sent[0]!.subject).toBe("ana joined PlayRates from your invite");
  });

  it("skips one missing what it needs, as the bell would", async () => {
    const { service, email } = setup();
    expect(
      await service.sendEvent({
        userId: USER_A,
        kind: "community_reply",
        actorId: USER_B,
        data: { threadId: 3 },
      }),
    ).toBe(false);
    expect(email.sent).toHaveLength(0);
  });
});

describe("welcome email", () => {
  it("goes once, ever, with every email's way out", async () => {
    const { service, email } = setup([buildProfile({ first_name: "Cal" })]);
    expect(await service.sendWelcome(USER_A)).toBe(true);
    expect(await service.sendWelcome(USER_A)).toBe(false);
    expect(email.sent).toHaveLength(1);
    expect(email.sent[0]!.html).toContain("Welcome to PlayRates, Cal");
    expect(email.sent[0]!.html).toContain("Turn off all emails");
  });

  it("isn't sent to someone with all emails off", async () => {
    const { service, email } = setup([buildProfile({ email_prefs: { all: false } })]);
    expect(await service.sendWelcome(USER_A)).toBe(false);
    expect(email.sent).toHaveLength(0);
  });
});

describe("wishlist release emails", () => {
  it("groups each member's games, once each", () => {
    const row = (user_id: string, game_id: number) => ({
      user_id,
      game_id,
      title: `Game ${game_id}`,
      slug: `g${game_id}`,
      cover_url: null,
    });
    const grouped = groupWishlistReleases([row(USER_A, 1), row(USER_A, 2), row(USER_B, 1), row(USER_A, 1)]);
    expect(grouped.get(USER_A)!.map((g) => g.id)).toEqual([1, 2]);
    expect(grouped.get(USER_B)!.map((g) => g.id)).toEqual([1]);
  });

  it("sends one email per member for the day, and not twice", async () => {
    const { service, state, email } = setup([
      buildProfile(),
      buildProfile({ id: USER_B, username: "ana", email_prefs: { wishlist_releases: false } }),
    ]);
    state.gameLogs.push(
      buildGameLog({ id: 1, user_id: USER_A, game_id: 1, status: "wishlist" }),
      buildGameLog({ id: 2, user_id: USER_A, game_id: 2, status: "wishlist" }),
      buildGameLog({ id: 3, user_id: USER_A, game_id: 3, status: "wishlist" }),
      buildGameLog({ id: 4, user_id: USER_B, game_id: 1, status: "wishlist" }),
    );

    expect(await service.sendWishlistReleases("2026-11-05")).toEqual({ sent: 1 });
    expect(email.sent[0]!.subject).toBe("2 games on your wishlist are out today");
    expect(await service.sendWishlistReleases("2026-11-05")).toEqual({ sent: 0 });
  });
});

describe("the news audience", () => {
  const member = (id: string, email: string, prefs: Record<string, boolean> = {}) => ({
    id,
    email,
    username: id,
    email_prefs: prefs,
  });

  it("adds, unsubscribes and removes to match members", () => {
    const plan = planReconcile(
      [
        member("new", "new@x.test"),
        member("quiet", "quiet@x.test", { news: false }),
        member("silent", "silent@x.test", { all: false }),
        member("left", "left@x.test"),
        member("same", "SAME@x.test"),
        member("off", "off@x.test", { news: false }),
      ],
      [
        { email: "quiet@x.test", unsubscribed: false },
        { email: "silent@x.test", unsubscribed: false },
        { email: "left@x.test", unsubscribed: true },
        { email: "same@x.test", unsubscribed: false },
        { email: "gone@x.test", unsubscribed: false },
      ],
    );
    expect(plan.upsert).toEqual([
      { email: "new@x.test", subscribed: true },
      { email: "quiet@x.test", subscribed: false },
      { email: "silent@x.test", subscribed: false },
    ]);
    expect(plan.remove).toEqual(["gone@x.test"]);
    // Resend unsubscribed them; we never subscribe them again ourselves.
    expect(plan.newsOff).toEqual(["left"]);
  });

  it("stops at its limit and says what's left", async () => {
    const { service, email } = setup();
    const done = await service.reconcileAudience({ limit: 1, deadline: Date.now() + 10_000 });
    expect(done).toMatchObject({ upserted: 1, pending: 1 });
    expect(email.contacts.size).toBe(1);
  });

  it("turns news off for someone Resend unsubscribed", async () => {
    const { service, state, email } = setup();
    email.contacts.set(emailOf(USER_A), { email: emailOf(USER_A), unsubscribed: true });
    await service.reconcileAudience({ limit: 10, deadline: Date.now() + 10_000 });
    expect(state.profiles[0]!.email_prefs).toEqual({ news: false });
  });

  it("counts who a news email would reach", async () => {
    const { service, state } = setup([
      buildProfile(),
      buildProfile({ id: USER_B, username: "ana", email_prefs: { news: false } }),
    ]);
    expect(await service.newsRecipientCount()).toBe(1);
    state.unconfirmed.add(USER_A);
    expect(await service.newsRecipientCount()).toBe(0);
  });
});

describe("the daily cap", () => {
  /** As if `n` emails went out earlier today. */
  const alreadySent = (state: ReturnType<typeof setup>["state"], n: number) =>
    state.emailSends.push({
      id: 999,
      kind: "friend_request",
      status: "sent",
      recipients: n,
      transactional: true,
      error: null,
      sent_at: new Date(Date.now() - 60_000).toISOString(),
    });

  it("sends up to the cap, then logs what it turned away", async () => {
    const { service, state, email } = setup();
    alreadySent(state, EMAIL_LIMITS.cap - 1);

    expect(await service.sendEvent(friendRequest)).toBe(true);
    expect(
      await service.sendEvent({ ...friendRequest, userId: USER_B, actorId: USER_A }),
    ).toBe(false);

    expect(email.sent).toHaveLength(1);
    expect(state.emailSends.filter((s) => s.status === "capped")).toEqual([
      expect.objectContaining({ kind: "friend_request", recipients: 1 }),
    ]);
  });

  it("gives a capped email's claim back, so it can go once there's room", async () => {
    const { service, state, email } = setup();
    alreadySent(state, EMAIL_LIMITS.cap);
    expect(await service.sendEvent(friendRequest)).toBe(false);

    state.emailSends = state.emailSends.filter((s) => s.id !== 999);
    expect(await service.sendEvent(friendRequest)).toBe(true);
    expect(email.sent).toHaveLength(1);
  });

  it("counts only the last 24 hours", async () => {
    const { service, state } = setup();
    alreadySent(state, EMAIL_LIMITS.cap);
    state.emailSends[0]!.sent_at = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    expect(await service.sendEvent(friendRequest)).toBe(true);
  });

  it("logs a send that failed as failed", async () => {
    const { service, state, email } = setup();
    email.failSends = true;
    await expect(service.sendEvent(friendRequest)).rejects.toThrow("provider down");
    expect(state.emailSends).toEqual([
      expect.objectContaining({ status: "failed", error: "provider down" }),
    ]);
  });

  it("always sends the admin's test, and counts it", async () => {
    const { service, state, email } = setup();
    alreadySent(state, EMAIL_LIMITS.cap);
    await service.sendNewsTest(
      { kind: "announcement", tone: "info", title: "Hi", body: "There", link: null },
      "admin@x.test",
    );
    expect(email.sent).toHaveLength(1);
    expect(state.emailSends.at(-1)).toMatchObject({ kind: "news_test", status: "sent" });
  });

  it("sends wishlist emails up to the cap and gives the rest back", async () => {
    const { service, state, email } = setup();
    alreadySent(state, EMAIL_LIMITS.cap - 1);
    state.gameLogs.push(
      buildGameLog({ id: 1, user_id: USER_A, game_id: 1, status: "wishlist" }),
      buildGameLog({ id: 2, user_id: USER_B, game_id: 1, status: "wishlist" }),
    );

    expect(await service.sendWishlistReleases("2026-11-05")).toEqual({ sent: 1 });
    expect(email.sent).toHaveLength(1);
    expect(state.emailLog.filter((r) => r.kind === "wishlist_release")).toHaveLength(1);
  });

  it("logs a broadcast apart from the daily allowance", async () => {
    const { service, state } = setup();
    await service.broadcastNews({
      kind: "announcement",
      tone: "info",
      title: "Hi",
      body: "There",
      link: null,
    });
    expect(state.emailSends).toEqual([
      expect.objectContaining({ kind: "announcement", recipients: 2, transactional: false }),
    ]);
    expect(await service.sendEvent(friendRequest)).toBe(true);
  });
});

describe("email stats", () => {
  it("puts the log and Resend's count together", async () => {
    const { service, email } = setup();
    email.recent = { sent: 12, more: false, bounced: 1, complained: 0 };
    await service.sendEvent(friendRequest);

    const stats = await service.stats();
    expect(stats.last24h).toEqual({ sent: 1, capped: 0, failed: 0 });
    expect(stats.resend).toEqual(email.recent);
    expect(stats.kinds).toEqual([{ kind: "friend_request", sent: 1 }]);
    expect(stats.newsSubscribers).toBe(2);
  });

  it("leaves Resend's figures out when it doesn't answer", async () => {
    const { service, email } = setup();
    email.recent = null;
    expect((await service.stats()).resend).toBeNull();
  });
});

describe("Resend's webhook", () => {
  const key = Buffer.from("test-webhook-secret");
  const deliver = (
    service: ReturnType<typeof setup>["service"],
    event: unknown,
  ) => {
    const body = Buffer.from(JSON.stringify(event));
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = createHmac("sha256", key)
      .update(`msg_1.${timestamp}.`)
      .update(body)
      .digest("base64");
    return service.handleWebhook({ id: "msg_1", timestamp, signature: `v1,${signature}` }, body);
  };

  it("turns news off for a contact who unsubscribed through Resend", async () => {
    const { service, state } = setup();
    expect(
      await deliver(service, {
        type: "contact.updated",
        data: { email: emailOf(USER_A), unsubscribed: true },
      }),
    ).toBe(true);
    expect(state.profiles[0]!.email_prefs).toEqual({ news: false });
  });

  it("leaves news alone when all is what's off", async () => {
    const { service, state } = setup([buildProfile({ email_prefs: { all: false } })]);
    await deliver(service, {
      type: "contact.updated",
      data: { email: emailOf(USER_A), unsubscribed: true },
    });
    expect(state.profiles[0]!.email_prefs).toEqual({ all: false });
  });

  it("ignores other events", async () => {
    const { service, state } = setup();
    await deliver(service, { type: "email.delivered", data: { email: emailOf(USER_A) } });
    expect(state.profiles[0]!.email_prefs).toEqual({});
  });

  it("refuses anything unsigned", async () => {
    const { service } = setup();
    expect(
      await service.handleWebhook(
        { id: "msg_1", timestamp: "1", signature: "v1,AAAA" },
        Buffer.from("{}"),
      ),
    ).toBe(false);
  });
});
