import {
  ACTIVITY_GROUPS,
  GAME_EVENT_GROUPS,
  type AdminActivityQuery,
  type AdminBucket,
  type AdminGameEventsQuery,
  type AdminMetric,
  type AdminTotals,
  type AdminUsersQuery,
  type AnnouncementInput,
} from "@playrates/shared";
import type { Db } from "../../config/supabase.js";
import { likeTerm } from "../../lib/likeTerm.js";
import type {
  AdminActivityFeedRow,
  AdminGameFeedRow,
  AdminSeriesRow,
  AdminUserDirectoryRow,
  AnnouncementCardRow,
  AnnouncementRow,
  IgdbUsageDayRow,
  ServerErrorRow,
} from "../../types/database.types.js";

export interface ServerErrorRowWithUser extends ServerErrorRow {
  username: string | null;
}

/** A standing entry in the patch notes: top-level and not deleted. */
export interface PatchNoteEntryRow {
  id: number;
  thread_id: number;
  body: unknown;
  created_at: string;
  edited_at: string | null;
}

export interface AdminRepository {
  ping(): Promise<void>;
  totals(): Promise<AdminTotals>;
  /** Inclusive dates, YYYY-MM-DD. */
  series(from: string, to: string, bucket: AdminBucket): Promise<AdminSeriesRow[]>;
  metricDetail(
    metric: AdminMetric,
    from: string,
    to: string,
  ): Promise<Record<string, unknown>>;

  /** Newest first, one more than `limit` so the caller knows if there is more. */
  activity(query: AdminActivityQuery): Promise<AdminActivityFeedRow[]>;
  gameEvents(query: AdminGameEventsQuery): Promise<AdminGameFeedRow[]>;

  users(
    query: AdminUsersQuery,
    from: number,
    to: number,
  ): Promise<{ rows: AdminUserDirectoryRow[]; total: number }>;
  userById(id: string): Promise<AdminUserDirectoryRow | null>;

  /** Days on or after `from`, oldest first. */
  igdbUsage(from: string): Promise<IgdbUsageDayRow[]>;
  /** Days a person used PlayRates on or after `from`, oldest first. */
  userActiveDays(id: string, from: string): Promise<string[]>;

  getSetting<T>(key: string): Promise<T | null>;
  setSetting(key: string, value: unknown): Promise<void>;

  serverErrors(before: number | undefined, limit: number): Promise<ServerErrorRowWithUser[]>;
  serverErrorStats(since: string): Promise<{ count: number; lastAt: string | null }>;

  listAnnouncements(): Promise<AnnouncementCardRow[]>;
  findAnnouncement(id: number): Promise<AnnouncementCardRow | null>;
  createAnnouncement(
    input: AnnouncementInput,
    sentBy: string,
    patchNoteMessageId?: number,
  ): Promise<AnnouncementRow>;
  /** Delivers to every account, returning how many it reached. */
  broadcastAnnouncement(id: number): Promise<number>;
  /** Takes every copy back out of every inbox. */
  retractAnnouncement(id: number): Promise<void>;

  /** Newest first. */
  listPatchNoteEntries(): Promise<PatchNoteEntryRow[]>;
  findPatchNoteEntry(messageId: number): Promise<PatchNoteEntryRow | null>;
  /** Announcements of patch-notes entries that have not been taken back. */
  standingPatchNoteAnnouncements(): Promise<AnnouncementCardRow[]>;
}

export const announcementKey = (id: number): string => `announcement:${id}`;


const USER_SORT: Record<AdminUsersQuery["sort"], keyof AdminUserDirectoryRow> = {
  recent: "last_seen_at",
  joined: "created_at",
  active: "active_day_count",
};

export const createAdminRepository = (db: Db): AdminRepository => ({
  async ping() {
    const { error } = await db
      .from("profiles")
      .select("id", { head: true, count: "exact" })
      .limit(1);
    if (error) throw error;
  },

  async totals() {
    const { data, error } = await db.rpc("admin_totals");
    if (error) throw error;
    return data as AdminTotals;
  },

  async series(from, to, bucket) {
    const { data, error } = await db.rpc("admin_series", {
      p_from: from,
      p_to: to,
      p_bucket: bucket,
    });
    if (error) throw error;
    return (data ?? []) as AdminSeriesRow[];
  },

  async metricDetail(metric, from, to) {
    const { data, error } = await db.rpc("admin_metric_detail", {
      p_metric: metric,
      p_from: from,
      p_to: to,
    });
    if (error) throw error;
    return (data ?? {}) as Record<string, unknown>;
  },

  async activity({ before, limit, group, kind, userId }) {
    let builder = db
      .from("admin_activity_feed")
      .select("*")
      .order("id", { ascending: false })
      .limit(limit + 1);
    if (before) builder = builder.lt("id", before);
    if (group) builder = builder.in("kind", [...ACTIVITY_GROUPS[group]]);
    if (kind) builder = builder.eq("kind", kind);
    if (userId) builder = builder.eq("actor_id", userId);

    const { data, error } = await builder;
    if (error) throw error;
    return (data ?? []) as AdminActivityFeedRow[];
  },

  async gameEvents({ before, limit, group, gameId }) {
    let builder = db
      .from("admin_game_feed")
      .select("*")
      .order("id", { ascending: false })
      .limit(limit + 1);
    if (before) builder = builder.lt("id", before);
    if (group) builder = builder.in("kind", [...GAME_EVENT_GROUPS[group]]);
    if (gameId) builder = builder.eq("game_id", gameId);

    const { data, error } = await builder;
    if (error) throw error;
    return (data ?? []) as AdminGameFeedRow[];
  },

  async users(query, from, to) {
    let builder = db
      .from("admin_user_directory")
      .select("*", { count: "exact" })
      .order(USER_SORT[query.sort], { ascending: false })
      .order("id")
      .range(from, to);
    if (query.q) builder = builder.ilike("username", likeTerm(query.q));

    const { data, error, count } = await builder;
    if (error) throw error;
    return { rows: (data ?? []) as AdminUserDirectoryRow[], total: count ?? 0 };
  },

  async userById(id) {
    const { data, error } = await db
      .from("admin_user_directory")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return (data as AdminUserDirectoryRow | null) ?? null;
  },

  async igdbUsage(from) {
    const { data, error } = await db
      .from("igdb_usage_days")
      .select("*")
      .gte("day", from)
      .order("day");
    if (error) throw error;
    return (data ?? []) as IgdbUsageDayRow[];
  },

  async userActiveDays(id, from) {
    const { data, error } = await db
      .from("user_active_days")
      .select("day")
      .eq("user_id", id)
      .gte("day", from)
      .order("day");
    if (error) throw error;
    return (data ?? []).map((row) => row.day as string);
  },

  async getSetting<T>(key: string) {
    const { data, error } = await db
      .from("admin_settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    if (error) throw error;
    return ((data?.value as T | undefined) ?? null) as T | null;
  },

  async setSetting(key, value) {
    const { error } = await db
      .from("admin_settings")
      .upsert({ key, value }, { onConflict: "key" });
    if (error) throw error;
  },

  async serverErrors(before, limit) {
    let builder = db
      .from("server_errors")
      .select("*")
      .order("id", { ascending: false })
      .limit(limit + 1);
    if (before) builder = builder.lt("id", before);

    const { data, error } = await builder;
    if (error) throw error;
    const rows = (data ?? []) as ServerErrorRow[];

    // No foreign key to embed through: the log outlives the accounts in it.
    const ids = [...new Set(rows.map((r) => r.user_id).filter(Boolean))] as string[];
    const names = new Map<string, string>();
    if (ids.length > 0) {
      const { data: profiles, error: profileError } = await db
        .from("profiles")
        .select("id, username")
        .in("id", ids);
      if (profileError) throw profileError;
      for (const p of profiles ?? []) names.set(p.id as string, p.username as string);
    }

    return rows.map((row) => ({
      ...row,
      username: row.user_id ? (names.get(row.user_id) ?? null) : null,
    }));
  },

  async serverErrorStats(since) {
    const [{ count, error }, { data: last, error: lastError }] = await Promise.all([
      db
        .from("server_errors")
        .select("id", { head: true, count: "exact" })
        .gte("created_at", since),
      db
        .from("server_errors")
        .select("created_at")
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (error) throw error;
    if (lastError) throw lastError;
    return {
      count: count ?? 0,
      lastAt: (last?.created_at as string | undefined) ?? null,
    };
  },

  async listAnnouncements() {
    const { data, error } = await db
      .from("announcement_cards")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data ?? []) as AnnouncementCardRow[];
  },

  async findAnnouncement(id) {
    const { data, error } = await db
      .from("announcement_cards")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return (data as AnnouncementCardRow | null) ?? null;
  },

  async createAnnouncement(input, sentBy, patchNoteMessageId) {
    const { data, error } = await db
      .from("announcements")
      .insert({
        tone: input.tone,
        title: input.title,
        body: input.body,
        link_path: input.link,
        sent_by: sentBy,
        patch_note_message_id: patchNoteMessageId ?? null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data as AnnouncementRow;
  },

  async broadcastAnnouncement(id) {
    const { data, error } = await db.rpc("broadcast_announcement", { p_id: id });
    if (error) throw error;
    return (data as number | null) ?? 0;
  },

  async retractAnnouncement(id) {
    const { error } = await db
      .from("notifications")
      .delete()
      .eq("kind", "announcement")
      .eq("dedupe_key", announcementKey(id));
    if (error) throw error;

    const { error: markError } = await db
      .from("announcements")
      .update({ retracted_at: new Date().toISOString() })
      .eq("id", id);
    if (markError) throw markError;
  },
  async listPatchNoteEntries() {
    const { data, error } = await db
      .from("community_messages")
      .select("id, thread_id, body, created_at, edited_at, community_threads!inner(subject_kind)")
      .eq("community_threads.subject_kind", "patch_notes")
      .is("parent_id", null)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
    if (error) throw error;
    return ((data ?? []) as (PatchNoteEntryRow & { community_threads?: unknown })[]).map(
      ({ community_threads: _thread, ...row }) => row,
    );
  },

  async findPatchNoteEntry(messageId) {
    const { data, error } = await db
      .from("community_messages")
      .select("id, thread_id, body, created_at, edited_at, community_threads!inner(subject_kind)")
      .eq("id", messageId)
      .eq("community_threads.subject_kind", "patch_notes")
      .is("parent_id", null)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const { community_threads: _thread, ...row } = data as PatchNoteEntryRow & {
      community_threads?: unknown;
    };
    return row;
  },

  async standingPatchNoteAnnouncements() {
    const { data, error } = await db
      .from("announcement_cards")
      .select("*")
      .not("patch_note_message_id", "is", null)
      .is("retracted_at", null);
    if (error) throw error;
    return (data ?? []) as AnnouncementCardRow[];
  },
});
