import {
  EMAIL_MESSAGE_GROUPS,
  type AdminEmailMessagesQuery,
  type EmailMessageStatus,
} from "@playrates/shared";
import type { Db } from "../../config/supabase.js";
import type {
  EmailMessageWithMember,
  EmailSendTotalRow,
  MemberEmailRow,
  WishlistReleaseRow,
  WeeklyDigestRow,
} from "../../types/database.types.js";

/** What a send asks of the day's allowance. */
export interface SlotRequest {
  kind: string;
  count: number;
  /** The most the last 24 hours may hold; null for no limit. */
  cap: number | null;
  /** False for a broadcast, which Resend counts apart. */
  transactional: boolean;
}

/** One email to one person, as it's written to the log. */
export interface NewEmailMessage {
  userId: string | null;
  to: string;
  kind: string;
  subject: string;
  status: Extract<EmailMessageStatus, "capped" | "failed" | "sent">;
  resendId?: string | null;
  broadcastId?: string | null;
  detail?: string | null;
}

/** What Resend's webhook said became of an email. */
export interface DeliveryEvent {
  resendId: string;
  broadcastId: string | null;
  to: string | null;
  status: EmailMessageStatus;
  detail: string | null;
}

export interface EmailRepository {
  /**
   * Takes the right to send this email: false when one under the same key
   * went out within `withinMs`, or ever with no window. Atomic, so two
   * raises at once send one email.
   */
  claim(
    userId: string,
    kind: string,
    ref: string,
    withinMs: number | null,
  ): Promise<boolean>;
  /** Gives the claim back, for a send that failed. */
  release(userId: string, kind: string, ref: string): Promise<void>;
  /** claim with no window, for many members in one statement: the ones
   *  claimed now, leaving out any already sent. */
  claimOnce(userIds: string[], kind: string, ref: string): Promise<string[]>;
  /** release, for many members at once. */
  releaseMany(userIds: string[], kind: string, ref: string): Promise<void>;
  /** Members with a confirmed address; everyone for null. */
  memberEmails(ids: string[] | null): Promise<MemberEmailRow[]>;
  memberIdByEmail(email: string): Promise<string | null>;
  wishlistReleasesOn(day: string): Promise<WishlistReleaseRow[]>;
  /** Members with anything for a digest covering `since` onwards, and
   *  wishlist releases on days `from` to `to`. */
  weeklyDigest(
    since: string,
    from: string,
    to: string,
  ): Promise<WeeklyDigestRow[]>;
  /** Overwrites the stored switches with these. */
  setPrefs(userId: string, prefs: Record<string, boolean>): Promise<void>;
  /**
   * Takes what the cap allows of `count`, recording it and whatever was
   * turned away. The record's id, to mark it failed if the send is.
   */
  takeSlots(
    request: SlotRequest,
  ): Promise<{ id: number | null; granted: number }>;
  markFailed(id: number, error: string): Promise<void>;
  sendTotals(since: string): Promise<EmailSendTotalRow[]>;
  logMessages(messages: NewEmailMessage[]): Promise<void>;
  /** Moves the email's row on, never back. How many rows it moved. */
  recordEvent(event: DeliveryEvent): Promise<number>;
  /** The log, newest first, one more than `limit` to tell if there's more. */
  messages(query: AdminEmailMessagesQuery): Promise<EmailMessageWithMember[]>;
}

const UNIQUE_VIOLATION = "23505";
/** Matches the column's own limit on what's kept of an error. */
const DETAIL_MAX = 500;
/** PostgREST hands back at most this many rows a request. */
const PAGE = 1000;

export const createEmailRepository = (db: Db): EmailRepository => ({
  async claim(userId, kind, ref, withinMs) {
    const { error } = await db
      .from("email_log")
      .insert({ user_id: userId, kind, ref });
    if (!error) return true;
    if (error.code !== UNIQUE_VIOLATION) throw error;
    if (withinMs === null) return false;

    // Only an old enough row moves, so of two racing here one wins.
    const { data, error: updateError } = await db
      .from("email_log")
      .update({ sent_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("kind", kind)
      .eq("ref", ref)
      .lt("sent_at", new Date(Date.now() - withinMs).toISOString())
      .select("id");
    if (updateError) throw updateError;
    return (data ?? []).length > 0;
  },

  async claimOnce(userIds, kind, ref) {
    if (userIds.length === 0) return [];
    const { data, error } = await db
      .from("email_log")
      .upsert(
        userIds.map((user_id) => ({ user_id, kind, ref })),
        { onConflict: "user_id,kind,ref", ignoreDuplicates: true },
      )
      .select("user_id");
    if (error) throw error;
    return ((data ?? []) as { user_id: string }[]).map((r) => r.user_id);
  },

  async releaseMany(userIds, kind, ref) {
    if (userIds.length === 0) return;
    const { error } = await db
      .from("email_log")
      .delete()
      .in("user_id", userIds)
      .eq("kind", kind)
      .eq("ref", ref);
    if (error) throw error;
  },

  async release(userId, kind, ref) {
    const { error } = await db
      .from("email_log")
      .delete()
      .eq("user_id", userId)
      .eq("kind", kind)
      .eq("ref", ref);
    if (error) throw error;
  },

  async memberEmails(ids) {
    const rows: MemberEmailRow[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await db
        .rpc("member_emails", { p_ids: ids })
        .range(from, from + PAGE - 1);
      if (error) throw error;
      const page = (data ?? []) as MemberEmailRow[];
      rows.push(...page);
      if (page.length < PAGE) return rows;
    }
  },

  async memberIdByEmail(email) {
    const { data, error } = await db.rpc("member_id_by_email", {
      p_email: email,
    });
    if (error) throw error;
    return (data as string | null) ?? null;
  },

  async weeklyDigest(since, from, to) {
    const rows: WeeklyDigestRow[] = [];
    for (let start = 0; ; start += PAGE) {
      const { data, error } = await db
        .rpc("weekly_digest", { p_since: since, p_from: from, p_to: to })
        .range(start, start + PAGE - 1);
      if (error) throw error;
      const page = (data ?? []) as WeeklyDigestRow[];
      rows.push(...page);
      if (page.length < PAGE) return rows;
    }
  },

  async wishlistReleasesOn(day) {
    const rows: WishlistReleaseRow[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await db
        .rpc("wishlist_releases_on", { p_day: day })
        .range(from, from + PAGE - 1);
      if (error) throw error;
      const page = (data ?? []) as WishlistReleaseRow[];
      rows.push(...page.map((r) => ({ ...r, game_id: Number(r.game_id) })));
      if (page.length < PAGE) return rows;
    }
  },

  async setPrefs(userId, prefs) {
    const { error } = await db
      .from("profiles")
      .update({ email_prefs: prefs })
      .eq("id", userId);
    if (error) throw error;
  },

  async takeSlots({ kind, count, cap, transactional }) {
    const { data, error } = await db.rpc("take_email_slots", {
      p_kind: kind,
      p_count: count,
      p_cap: cap,
      p_transactional: transactional,
    });
    if (error) throw error;
    const [row] = (data ?? []) as { id: number | null; granted: number }[];
    return { id: row?.id ?? null, granted: row?.granted ?? 0 };
  },

  async markFailed(id, message) {
    const { error } = await db
      .from("email_sends")
      .update({ status: "failed", error: message.slice(0, DETAIL_MAX) })
      .eq("id", id);
    if (error) throw error;
  },

  async sendTotals(since) {
    const { data, error } = await db.rpc("email_send_totals", {
      p_since: since,
    });
    if (error) throw error;
    return ((data ?? []) as EmailSendTotalRow[]).map((r) => ({
      ...r,
      sends: Number(r.sends),
      recipients: Number(r.recipients),
    }));
  },

  async logMessages(messages) {
    if (messages.length === 0) return;
    const { error } = await db.from("email_messages").insert(
      messages.map((m) => ({
        user_id: m.userId,
        to_address: m.to,
        kind: m.kind,
        subject: m.subject,
        status: m.status,
        resend_id: m.resendId ?? null,
        broadcast_id: m.broadcastId ?? null,
        detail: m.detail?.slice(0, DETAIL_MAX) ?? null,
      })),
    );
    if (error) throw error;
  },

  async recordEvent({ resendId, broadcastId, to, status, detail }) {
    const { data, error } = await db.rpc("record_email_event", {
      p_resend_id: resendId,
      p_broadcast_id: broadcastId,
      p_to: to,
      p_status: status,
      p_detail: detail,
    });
    if (error) throw error;
    return Number(data ?? 0);
  },

  async messages({ before, limit, group, userId }) {
    let builder = db
      .from("email_messages")
      .select("*, profiles(id, username, avatar_url, accent)")
      .order("id", { ascending: false })
      .limit(limit + 1);
    if (before) builder = builder.lt("id", before);
    if (group) builder = builder.in("status", [...EMAIL_MESSAGE_GROUPS[group]]);
    if (userId) builder = builder.eq("user_id", userId);
    const { data, error } = await builder;
    if (error) throw error;
    return (data ?? []) as unknown as EmailMessageWithMember[];
  },
});
