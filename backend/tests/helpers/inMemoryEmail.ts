import type { EmailDeps } from "../../src/config/email.js";
import type { EmailRepository } from "../../src/modules/email/email.repository.js";
import type {
  AudienceContact,
  BroadcastContent,
  NewsAudience,
} from "../../src/modules/email/email.audience.js";
import type {
  EmailMessage,
  EmailSender,
} from "../../src/modules/email/email.sender.js";
import type { RecentSends, SendActivity } from "../../src/modules/email/email.activity.js";
import type { EmailSendTotalRow } from "../../src/types/database.types.js";
import type { InMemoryState } from "./inMemoryRepos.js";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Every member's address in the fakes, as the auth admin fake gives it. */
export const emailOf = (userId: string) => `${userId}@example.test`;

export const TEST_EMAIL_SETTINGS = {
  site: "https://playrates.test",
  api: "https://playrates.test/api/v1",
  signingSecret: "test-email-signing-secret",
  webhookSecret: `whsec_${Buffer.from("test-webhook-secret").toString("base64")}`,
};

/**
 * email_log, member_emails and wishlist_releases_on over the shared state.
 * A member's address is confirmed unless their id is in `unconfirmed`.
 */
export const createInMemoryEmailRepo = (
  state: InMemoryState,
  now: () => number = Date.now,
): EmailRepository => {
  let nextId = 1;
  let nextSendId = 1;
  const find = (userId: string, kind: string, ref: string) =>
    state.emailLog.find(
      (r) => r.user_id === userId && r.kind === kind && r.ref === ref,
    );
  return {
    async claim(userId, kind, ref, withinMs) {
      const row = find(userId, kind, ref);
      const at = new Date(now()).toISOString();
      if (!row) {
        state.emailLog.push({ id: nextId++, user_id: userId, kind, ref, sent_at: at });
        return true;
      }
      if (withinMs === null || Date.parse(row.sent_at) > now() - withinMs) {
        return false;
      }
      row.sent_at = at;
      return true;
    },
    async release(userId, kind, ref) {
      state.emailLog = state.emailLog.filter(
        (r) => !(r.user_id === userId && r.kind === kind && r.ref === ref),
      );
    },
    async memberEmails(ids) {
      return state.profiles
        .filter((p) => !state.unconfirmed.has(p.id))
        .filter((p) => ids === null || ids.includes(p.id))
        .map((p) => ({
          id: p.id,
          email: emailOf(p.id),
          username: p.username,
          email_prefs: p.email_prefs ?? {},
        }));
    },
    async memberIdByEmail(email) {
      return (
        state.profiles.find((p) => emailOf(p.id) === email.toLowerCase())?.id ??
        null
      );
    },
    async wishlistReleasesOn(day) {
      return state.gameLogs
        .filter((l) => l.status === "wishlist")
        .flatMap((l) => {
          const game = state.games.find((g) => g.id === l.game_id);
          return game && game.release_date === day
            ? [
                {
                  user_id: l.user_id,
                  game_id: game.id,
                  title: game.title,
                  slug: game.slug,
                  cover_url: game.box_art_url ?? game.cover_url,
                },
              ]
            : [];
        });
    },
    async setPrefs(userId, prefs) {
      const profile = state.profiles.find((p) => p.id === userId);
      if (profile) profile.email_prefs = prefs;
    },
    async takeSlots({ kind, count, cap, transactional }) {
      const used = state.emailSends
        .filter(
          (s) =>
            s.transactional &&
            s.status === "sent" &&
            Date.parse(s.sent_at) > now() - DAY_MS,
        )
        .reduce((sum, s) => sum + s.recipients, 0);
      const granted = cap === null ? count : Math.min(count, Math.max(cap - used, 0));
      const record = (status: "sent" | "capped", recipients: number) => {
        const id = nextSendId++;
        state.emailSends.push({
          id,
          kind,
          status,
          recipients,
          transactional,
          error: null,
          sent_at: new Date(now()).toISOString(),
        });
        return id;
      };
      const id = granted > 0 ? record("sent", granted) : null;
      if (granted < count) record("capped", count - granted);
      return { id, granted };
    },
    async markFailed(id, error) {
      const row = state.emailSends.find((s) => s.id === id);
      if (row) Object.assign(row, { status: "failed", error });
    },
    async sendTotals(since) {
      const totals = new Map<string, EmailSendTotalRow>();
      for (const s of state.emailSends) {
        if (s.sent_at < since) continue;
        const day = s.sent_at.slice(0, 10);
        const key = [day, s.kind, s.status, s.transactional].join("|");
        const row = totals.get(key) ?? {
          day,
          kind: s.kind,
          status: s.status,
          transactional: s.transactional,
          sends: 0,
          recipients: 0,
        };
        row.sends += 1;
        row.recipients += s.recipients;
        totals.set(key, row);
      }
      return [...totals.values()];
    },
  };
};

/** What the email fakes saw, for a test to assert on. */
export interface EmailRecorder {
  sent: EmailMessage[];
  contacts: Map<string, AudienceContact>;
  broadcasts: (BroadcastContent & { id: string })[];
  /** Waits for everything deferred until after the response. */
  flush(): Promise<void>;
  /** Makes sends and broadcasts throw, as a provider outage would. */
  failSends: boolean;
  /** What Resend says it sent; null makes it fail to answer. */
  recent: RecentSends | null;
}

export const createEmailFakes = (): { deps: EmailDeps; recorder: EmailRecorder } => {
  const pending: Promise<unknown>[] = [];
  const recorder: EmailRecorder = {
    sent: [],
    contacts: new Map(),
    broadcasts: [],
    failSends: false,
    recent: { sent: 0, more: false, bounced: 0, complained: 0 },
    async flush() {
      // Deferred work can defer more, as a send that syncs a contact does.
      while (pending.length > 0) await Promise.all(pending.splice(0));
    },
  };

  const sender: EmailSender = {
    name: "resend",
    async send(messages) {
      if (recorder.failSends) throw new Error("provider down");
      recorder.sent.push(...messages);
    },
  };

  const audience: NewsAudience = {
    async upsertContact(email, subscribed) {
      recorder.contacts.set(email, { email, unsubscribed: !subscribed });
    },
    async removeContact(email) {
      recorder.contacts.delete(email);
    },
    async listContacts() {
      return [...recorder.contacts.values()];
    },
    async broadcast(content) {
      if (recorder.failSends) throw new Error("provider down");
      const id = `broadcast-${recorder.broadcasts.length + 1}`;
      recorder.broadcasts.push({ ...content, id });
      return id;
    },
  };

  const activity: SendActivity = {
    async since() {
      if (!recorder.recent) throw new Error("Resend didn't answer");
      return recorder.recent;
    },
  };

  return {
    deps: {
      sender,
      audience,
      activity,
      settings: TEST_EMAIL_SETTINGS,
      defer: (work) => {
        pending.push(work.catch(() => undefined));
      },
    },
    recorder,
  };
};
