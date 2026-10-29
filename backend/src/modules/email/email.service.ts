import {
  EMAIL_CATEGORY_OF,
  EMAIL_LIMITS,
  emailAllowed,
  emailScopeLabel,
  resolveEmailPrefs,
  type EmailScope,
  type EmailStats,
  type UnsubscribeStatus,
} from "@playrates/shared";
import { AppError } from "../../lib/AppError.js";
import type { Defer } from "../../lib/afterResponse.js";
import type { Logger } from "../../lib/logger.js";
import type { MemberEmailRow } from "../../types/database.types.js";
import type { NotificationDraft } from "../notifications/notifications.repository.js";
import type { ProfilesRepository } from "../profiles/profiles.repository.js";
import type { SendActivity } from "./email.activity.js";
import type { NewsAudience } from "./email.audience.js";
import {
  eventEmail,
  groupWishlistReleases,
  planReconcile,
} from "./email.events.js";
import type { EmailRepository } from "./email.repository.js";
import { emailStatsStart, toEmailStats } from "./email.stats.js";
import { RESEND_BATCH_MAX, type EmailMessage, type EmailSender } from "./email.sender.js";
import {
  announcementEmail,
  patchNotesEmail,
  welcomeEmail,
  wishlistReleaseEmail,
  type EmailLinks,
  type RenderedEmail,
} from "./email.templates.js";
import {
  readUnsubscribeToken,
  signUnsubscribeToken,
} from "./email.tokens.js";
import { verifySvixSignature, type ContactEvent, type SvixHeaders } from "./email.webhook.js";

export interface EmailSettings {
  /** Where links in emails point. */
  site: string;
  /** The API as a mail app reaches it, for one-click unsubscribe. */
  api: string;
  signingSecret?: string;
  webhookSecret?: string;
}

/** A news email, before it's rendered for whoever it goes to. */
export type NewsContent =
  | {
      kind: "announcement";
      tone: Parameters<typeof announcementEmail>[0]["tone"];
      title: string;
      body: string;
      link: string | null;
    }
  | {
      kind: "patch_notes";
      subject: string;
      title: string | null;
      doc: Parameters<typeof patchNotesEmail>[0]["doc"];
      link: string;
    };

export interface EmailServiceDeps {
  repo: EmailRepository;
  profiles: Pick<ProfilesRepository, "findById">;
  sender: EmailSender;
  /** Null where there is no Resend segment: the local stack, tests. */
  audience: NewsAudience | null;
  /** Null without Resend: the local stack, tests. */
  activity: SendActivity | null;
  settings: EmailSettings;
  logger: Logger;
  /** Runs work after the response; awaited in tests. */
  defer: Defer;
}

const DAY_MS = 24 * 60 * 60 * 1000;
/** A notification resurfaced within a day is the same news. */
const EVENT_WINDOW_MS = DAY_MS;
/** Resend's placeholder for its own unsubscribe link in a broadcast. */
const RESEND_UNSUBSCRIBE = "{{{RESEND_UNSUBSCRIBE_URL}}}";

const renderNews = (content: NewsContent, links: EmailLinks): RenderedEmail =>
  content.kind === "announcement"
    ? announcementEmail(content, links)
    : patchNotesEmail(content, links);

export const createEmailService = ({
  repo,
  profiles,
  sender,
  audience,
  activity,
  settings,
  logger,
  defer,
}: EmailServiceDeps) => {
  const settingsUrl = `${settings.site}/settings?section=emails`;

  /** A member's links and one-click headers for a scope. Null without a
   *  signing secret: nothing goes out that can't be stopped. */
  const addressed = (
    userId: string,
    scope: EmailScope,
  ): { links: EmailLinks; headers: Record<string, string> } | null => {
    if (!settings.signingSecret) {
      logger.warn("EMAIL_SIGNING_SECRET is not set: email not sent");
      return null;
    }
    const token = signUnsubscribeToken(settings.signingSecret, { userId, scope });
    return {
      links: {
        site: settings.site,
        unsubscribe: `${settings.site}/unsubscribe?t=${token}`,
        settings: settingsUrl,
      },
      headers: {
        "List-Unsubscribe": `<${settings.api}/email/unsubscribe?t=${token}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    };
  };

  const message = (
    to: string,
    email: RenderedEmail,
    headers?: Record<string, string>,
  ): EmailMessage => ({ to, ...email, ...(headers ? { headers } : {}) });

  /**
   * Sends what the day's cap leaves room for of these, in order, and logs
   * it, turned-away ones included. How many went. A null cap is for the
   * admin's own test, which is one email and shouldn't be refused.
   */
  const sendCounted = async (
    kind: string,
    messages: EmailMessage[],
    cap: number | null = EMAIL_LIMITS.cap,
  ): Promise<number> => {
    if (messages.length === 0) return 0;
    const { id, granted } = await repo.takeSlots({
      kind,
      count: messages.length,
      cap,
      transactional: true,
    });
    if (granted < messages.length) {
      logger.warn({ kind, capped: messages.length - granted }, "email: daily cap reached");
    }
    if (granted === 0) return 0;
    try {
      await sender.send(messages.slice(0, granted));
    } catch (error) {
      if (id !== null) {
        await repo
          .markFailed(id, error instanceof Error ? error.message : String(error))
          .catch(() => undefined);
      }
      throw error;
    }
    return granted;
  };

  /** Keeps the audience in step with one member, where there is one. */
  const syncContact = async (userId: string): Promise<void> => {
    if (!audience) return;
    const [member] = await repo.memberEmails([userId]);
    if (!member) return;
    await audience.upsertContact(
      member.email,
      emailAllowed(resolveEmailPrefs(member.email_prefs), "news"),
    );
  };

  const newsRecipients = async (): Promise<MemberEmailRow[]> =>
    (await repo.memberEmails(null)).filter((m) =>
      emailAllowed(resolveEmailPrefs(m.email_prefs), "news"),
    );

  /** A broadcast doesn't touch the daily allowance, but is logged with
   *  everything else for the admin. */
  const logBroadcast = async (kind: string, recipients: number) => {
    if (recipients === 0) return;
    await repo
      .takeSlots({ kind, count: recipients, cap: null, transactional: false })
      .catch((error: unknown) => logger.warn({ err: error }, "email: broadcast not logged"));
  };

  const later = (what: string, work: () => Promise<unknown>) =>
    defer(
      work().catch((error: unknown) => {
        logger.error({ err: error }, `email: ${what} failed`);
      }),
    );

  const claimFor = (token: string) => {
    const claim = settings.signingSecret
      ? readUnsubscribeToken(settings.signingSecret, token)
      : null;
    if (!claim) throw AppError.badRequest("That unsubscribe link isn't valid");
    return claim;
  };

  const status = (scope: EmailScope, stored: Record<string, boolean>): UnsubscribeStatus => ({
    scope,
    label: emailScopeLabel(scope),
    on: resolveEmailPrefs(stored)[scope],
  });

  const service = {
    /** The email for a notification just raised, if it has one and its
     *  member wants it. */
    async sendEvent(draft: NotificationDraft): Promise<boolean> {
      const category = EMAIL_CATEGORY_OF[draft.kind];
      if (!category) return false;
      const [member] = await repo.memberEmails([draft.userId]);
      if (!member) return false;
      if (!emailAllowed(resolveEmailPrefs(member.email_prefs), category)) {
        return false;
      }
      const target = addressed(draft.userId, category);
      if (!target) return false;

      const actor = draft.actorId ? await profiles.findById(draft.actorId) : null;
      const email = eventEmail(
        draft.kind,
        draft.data ?? {},
        { username: member.username, avatar_url: null },
        actor,
        target.links,
      );
      if (!email) return false;

      const ref = draft.dedupeKey ?? `${draft.kind}:${Date.now()}`;
      if (!(await repo.claim(draft.userId, draft.kind, ref, EVENT_WINDOW_MS))) {
        return false;
      }
      let sent: number;
      try {
        sent = await sendCounted(draft.kind, [
          message(member.email, email, target.headers),
        ]);
      } catch (error) {
        await repo.release(draft.userId, draft.kind, ref);
        throw error;
      }
      if (sent === 0) await repo.release(draft.userId, draft.kind, ref);
      return sent > 0;
    },

    /** Once, ever, when a member first finishes setting up. */
    async sendWelcome(userId: string): Promise<boolean> {
      const [member] = await repo.memberEmails([userId]);
      if (!member) return false;
      // No switch of its own, but "all" off still means nothing.
      if (!resolveEmailPrefs(member.email_prefs).all) return false;
      const target = addressed(userId, "all");
      if (!target) return false;
      const profile = await profiles.findById(userId);
      if (!(await repo.claim(userId, "welcome", "welcome", null))) return false;
      let sent: number;
      try {
        sent = await sendCounted("welcome", [
          message(
            member.email,
            welcomeEmail(
              { username: member.username, firstName: profile?.first_name ?? null },
              target.links,
            ),
            target.headers,
          ),
        ]);
      } catch (error) {
        await repo.release(userId, "welcome", "welcome");
        throw error;
      }
      if (sent === 0) await repo.release(userId, "welcome", "welcome");
      return sent > 0;
    },

    /** Everyone with a wishlisted game out on `day` (YYYY-MM-DD), one
     *  email each however many games. Safe to run twice. */
    async sendWishlistReleases(day: string): Promise<{ sent: number }> {
      const byUser = groupWishlistReleases(await repo.wishlistReleasesOn(day));
      if (byUser.size === 0) return { sent: 0 };
      const members = await repo.memberEmails([...byUser.keys()]);

      const queued: { userId: string; message: EmailMessage }[] = [];
      for (const member of members) {
        const games = byUser.get(member.id);
        if (!games) continue;
        const prefs = resolveEmailPrefs(member.email_prefs);
        if (!emailAllowed(prefs, "wishlist_releases")) continue;
        const target = addressed(member.id, "wishlist_releases");
        if (!target) break;
        if (!(await repo.claim(member.id, "wishlist_release", day, null))) continue;
        queued.push({
          userId: member.id,
          message: message(
            member.email,
            wishlistReleaseEmail({ games, username: member.username }, target.links),
            target.headers,
          ),
        });
      }

      let sent = 0;
      for (let i = 0; i < queued.length; i += RESEND_BATCH_MAX) {
        const chunk = queued.slice(i, i + RESEND_BATCH_MAX);
        let went: number;
        try {
          went = await sendCounted("wishlist_release", chunk.map((q) => q.message));
        } catch (error) {
          // Given back, so a second run today can try them again.
          for (const q of queued.slice(i)) {
            await repo.release(q.userId, "wishlist_release", day);
          }
          logger.error({ err: error, sent }, "email: wishlist releases failed");
          break;
        }
        sent += went;
        if (went < chunk.length) {
          // The cap's reached. Given back, as for a failure.
          for (const q of queued.slice(i + went)) {
            await repo.release(q.userId, "wishlist_release", day);
          }
          break;
        }
      }
      return { sent };
    },

    syncContact,

    async removeContact(email: string): Promise<void> {
      await audience?.removeContact(email);
    },

    /**
     * Brings the audience into line with members: adds the ones who want
     * news, unsubscribes the ones who don't, removes the ones who've gone.
     * At most `limit` writes, and none after `deadline`, so a big backfill
     * spreads over several days' runs rather than outliving the function.
     */
    async reconcileAudience({
      limit,
      deadline,
    }: {
      limit: number;
      deadline: number;
    }): Promise<{ upserted: number; removed: number; newsOff: number; pending: number }> {
      const done = { upserted: 0, removed: 0, newsOff: 0, pending: 0 };
      if (!audience) return done;
      const [members, contacts] = await Promise.all([
        repo.memberEmails(null),
        audience.listContacts(),
      ]);
      const plan = planReconcile(members, contacts);

      for (const id of plan.newsOff) {
        const member = members.find((m) => m.id === id)!;
        await repo.setPrefs(id, { ...member.email_prefs, news: false });
        done.newsOff += 1;
      }
      let writes = 0;
      const room = () => writes < limit && Date.now() < deadline;
      for (const { email, subscribed } of plan.upsert) {
        if (!room()) break;
        await audience.upsertContact(email, subscribed);
        writes += 1;
        done.upserted += 1;
      }
      for (const email of plan.remove) {
        if (!room()) break;
        await audience.removeContact(email);
        writes += 1;
        done.removed += 1;
      }
      done.pending =
        plan.upsert.length + plan.remove.length - done.upserted - done.removed;
      return done;
    },

    /** How many a news email would reach now. */
    async newsRecipientCount(): Promise<number> {
      return (await newsRecipients()).length;
    },

    /**
     * A news email to everyone who wants it. Through a Resend broadcast
     * where there's a segment; on the local stack, one by one to the mail
     * viewer, as the broadcast would have reached each. Whether it went,
     * and the broadcast's id.
     */
    async broadcastNews(
      content: NewsContent,
    ): Promise<{ emailed: boolean; broadcastId: string | null }> {
      if (audience) {
        const email = renderNews(content, {
          site: settings.site,
          unsubscribe: RESEND_UNSUBSCRIBE,
          settings: settingsUrl,
        });
        const broadcastId = await audience.broadcast({ name: email.subject, ...email });
        await logBroadcast(content.kind, (await newsRecipients()).length);
        return { emailed: true, broadcastId };
      }
      if (sender.name !== "mailpit") {
        logger.warn("RESEND_SEGMENT_ID is not set: news email not sent");
        return { emailed: false, broadcastId: null };
      }
      const messages: EmailMessage[] = [];
      for (const member of await newsRecipients()) {
        const target = addressed(member.id, "news");
        if (!target) return { emailed: false, broadcastId: null };
        messages.push(message(member.email, renderNews(content, target.links), target.headers));
      }
      await sender.send(messages);
      await logBroadcast(content.kind, messages.length);
      return { emailed: true, broadcastId: null };
    },

    /** The same news email, to one address only: the admin's proof. Its
     *  way out goes to Settings, as there's no broadcast behind it. */
    async sendNewsTest(content: NewsContent, to: string): Promise<void> {
      await sendCounted("news_test", [
        message(
          to,
          renderNews(content, {
            site: settings.site,
            unsubscribe: settingsUrl,
            settings: settingsUrl,
          }),
        ),
      ], null);
    },

    /** How email is going, for the admin. Resend not answering only
     *  leaves its own figures out. */
    async stats(now = new Date()): Promise<EmailStats> {
      const [days, window, resend, subscribers] = await Promise.all([
        repo.sendTotals(emailStatsStart(now)),
        repo.sendTotals(new Date(now.getTime() - DAY_MS).toISOString()),
        activity
          ? activity.since(new Date(now.getTime() - DAY_MS)).catch((error: unknown) => {
              logger.warn({ err: error }, "email: couldn't read Resend's sends");
              return null;
            })
          : null,
        newsRecipients(),
      ]);
      return toEmailStats({
        days,
        window,
        resend,
        newsSubscribers: subscribers.length,
        now,
      });
    },

    async unsubscribeStatus(token: string): Promise<UnsubscribeStatus> {
      const { userId, scope } = claimFor(token);
      const row = await profiles.findById(userId);
      if (!row) throw AppError.notFound("Account");
      return status(scope, row.email_prefs ?? {});
    },

    /** Turns the token's switch on or off, as its link or its undo asks.
     *  `widen` acts on "all" instead, with any of the member's tokens: the
     *  unsubscribe page's "Turn off all emails", and its undo. */
    async setByToken(
      token: string,
      on: boolean,
      widen?: "all",
    ): Promise<UnsubscribeStatus> {
      const claim = claimFor(token);
      const { userId } = claim;
      const scope: EmailScope = widen ?? claim.scope;
      const row = await profiles.findById(userId);
      if (!row) throw AppError.notFound("Account");
      const prefs = { ...(row.email_prefs ?? {}), [scope]: on };
      await repo.setPrefs(userId, prefs);
      if (scope === "news" || scope === "all") {
        later("contact sync", () => syncContact(userId));
      }
      return status(scope, prefs);
    },

    /**
     * Resend's webhook. Someone who unsubscribes through a broadcast's own
     * link has their news switch turned off, so Settings says what Resend
     * does. Only when news was on: the contact also updates when we
     * unsubscribe it ourselves, for "all" off, and that mustn't flip news.
     * False for a delivery that isn't Resend's.
     */
    async handleWebhook(headers: SvixHeaders, body: Buffer): Promise<boolean> {
      if (!settings.webhookSecret) return false;
      if (!verifySvixSignature(settings.webhookSecret, headers, body)) return false;
      let event: ContactEvent;
      try {
        event = JSON.parse(body.toString("utf8")) as ContactEvent;
      } catch {
        return true;
      }
      const email = event.data?.email;
      if (
        event.type !== "contact.updated" ||
        event.data?.unsubscribed !== true ||
        typeof email !== "string"
      ) {
        return true;
      }
      const userId = await repo.memberIdByEmail(email);
      const row = userId ? await profiles.findById(userId) : null;
      if (!row) return true;
      if (emailAllowed(resolveEmailPrefs(row.email_prefs), "news")) {
        await repo.setPrefs(row.id, { ...(row.email_prefs ?? {}), news: false });
      }
      return true;
    },

    /* After the response: none of these may fail or slow what caused it. */

    afterRaise(draft: NotificationDraft): void {
      if (!EMAIL_CATEGORY_OF[draft.kind]) return;
      later(draft.kind, () => service.sendEvent(draft));
    },

    afterOnboarding(userId: string): void {
      later("welcome", async () => {
        await service.sendWelcome(userId);
        await syncContact(userId);
      });
    },

    afterPrefsChange(userId: string): void {
      later("contact sync", () => syncContact(userId));
    },

    afterAccountDeleted(email: string): void {
      later("contact removal", () => service.removeContact(email));
    },
  };

  return service;
};

export type EmailService = ReturnType<typeof createEmailService>;
