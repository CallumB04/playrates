import type { Db } from "../../config/supabase.js";
import type {
  EmailSendTotalRow,
  MemberEmailRow,
  WishlistReleaseRow,
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
  /** Members with a confirmed address; everyone for null. */
  memberEmails(ids: string[] | null): Promise<MemberEmailRow[]>;
  memberIdByEmail(email: string): Promise<string | null>;
  wishlistReleasesOn(day: string): Promise<WishlistReleaseRow[]>;
  /** Overwrites the stored switches with these. */
  setPrefs(userId: string, prefs: Record<string, boolean>): Promise<void>;
  /**
   * Takes what the cap allows of `count`, recording it and whatever was
   * turned away. The record's id, to mark it failed if the send is.
   */
  takeSlots(request: SlotRequest): Promise<{ id: number | null; granted: number }>;
  markFailed(id: number, error: string): Promise<void>;
  sendTotals(since: string): Promise<EmailSendTotalRow[]>;
}

const UNIQUE_VIOLATION = "23505";
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
      .update({ status: "failed", error: message.slice(0, 500) })
      .eq("id", id);
    if (error) throw error;
  },

  async sendTotals(since) {
    const { data, error } = await db.rpc("email_send_totals", { p_since: since });
    if (error) throw error;
    return ((data ?? []) as EmailSendTotalRow[]).map((r) => ({
      ...r,
      sends: Number(r.sends),
      recipients: Number(r.recipients),
    }));
  },
});
