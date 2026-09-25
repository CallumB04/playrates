import type { NotificationKind } from "@playrates/shared";
import type { Db } from "../../config/supabase.js";
import type { NotificationRow } from "../../types/database.types.js";
import type { FriendProfileRow } from "../friends/friends.repository.js";

export interface NotificationRowWithActor extends NotificationRow {
  actor?: FriendProfileRow | null;
}

const SELECT_WITH_ACTOR = `
    *,
    actor:profiles!notifications_actor_id_fkey(id, username, avatar_url, accent, bio, last_seen_at)
`;

/** What a kind supplies when it raises one. The row's own bookkeeping —
 *  timestamps, read and archived state — is the table's business. */
export interface NotificationDraft {
  userId: string;
  /** Typed, so the open `kind` column can only ever take a kind the shared
   *  contract declares. */
  kind: NotificationKind;
  actorId?: string | null;
  data?: Record<string, unknown>;
  /** Identifies the subject. Re-raising the same key resurfaces the row it
   *  already has rather than adding a second. */
  dedupeKey?: string | null;
}

export interface NotificationsRepository {
  listForUser(
    userId: string,
    archived: boolean,
    from: number,
    to: number,
  ): Promise<{ rows: NotificationRowWithActor[]; total: number }>;
  countUnread(userId: string): Promise<number>;
  findById(id: number): Promise<NotificationRow | null>;
  update(
    id: number,
    patch: Partial<NotificationRow>,
  ): Promise<NotificationRowWithActor>;
  raise(draft: NotificationDraft): Promise<void>;
  markAllRead(userId: string): Promise<void>;
  /** No-op when the user has no notification under that key. */
  markReadByKey(userId: string, dedupeKey: string): Promise<void>;
  /** Counts a thread's activity notification up while it is unread, or
   *  starts it again at one. `data` is everything but the count. */
  bumpThreadActivity(
    userId: string,
    dedupeKey: string,
    data: Record<string, unknown>,
  ): Promise<void>;
  /** Whoever it was raised for: the subject is gone. */
  removeByKey(dedupeKey: string): Promise<void>;
}

/** Postgres' unique_violation. The insert in `raise` races against itself
 *  whenever the same notification is raised twice at once. */
const UNIQUE_VIOLATION = "23505";

export const createNotificationsRepository = (
  db: Db,
): NotificationsRepository => ({
  async listForUser(userId, archived, from, to) {
    const builder = db
      .from("notifications")
      .select(SELECT_WITH_ACTOR, { count: "exact" })
      .eq("user_id", userId);

    const { data, error, count } = await (
      archived
        ? builder.not("archived_at", "is", null)
        : builder.is("archived_at", null)
    )
      // id breaks ties: the backfill gave everyone the same created_at, and
      // without a second key those pages repeat and skip rows.
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, to);

    if (error) throw error;
    return {
      rows: (data ?? []) as NotificationRowWithActor[],
      total: count ?? 0,
    };
  },

  async countUnread(userId) {
    const { count, error } = await db
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null)
      .is("archived_at", null);
    if (error) throw error;
    return count ?? 0;
  },

  async findById(id) {
    const { data, error } = await db
      .from("notifications")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return (data as NotificationRow | null) ?? null;
  },

  async update(id, patch) {
    const { data, error } = await db
      .from("notifications")
      .update(patch)
      .eq("id", id)
      .select(SELECT_WITH_ACTOR)
      .single();
    if (error) throw error;
    return data as NotificationRowWithActor;
  },

  async raise({ userId, kind, actorId = null, data = {}, dedupeKey = null }) {
    const { error } = await db.from("notifications").insert({
      user_id: userId,
      kind,
      actor_id: actorId,
      data,
      dedupe_key: dedupeKey,
    });

    if (!error) return;
    // The dedupe index is partial, which rules out PostgREST's upsert: an
    // ON CONFLICT arbiter can only infer a partial index when the statement
    // repeats its predicate, and PostgREST has no way to write one.
    if (error.code !== UNIQUE_VIOLATION || !dedupeKey) throw error;

    const { error: resurfaceError } = await db
      .from("notifications")
      .update({
        actor_id: actorId,
        data,
        read_at: null,
        archived_at: null,
        // Back to the top of the inbox — it is news again.
        created_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("dedupe_key", dedupeKey);
    if (resurfaceError) throw resurfaceError;
  },

  async markAllRead(userId) {
    const { error } = await db
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("read_at", null)
      .is("archived_at", null);
    if (error) throw error;
  },

  async bumpThreadActivity(userId, dedupeKey, data) {
    const { error } = await db.rpc("bump_community_thread_activity", {
      p_user_id: userId,
      p_dedupe_key: dedupeKey,
      p_data: data,
    });
    if (error) throw error;
  },

  async removeByKey(dedupeKey) {
    const { error } = await db
      .from("notifications")
      .delete()
      .eq("dedupe_key", dedupeKey);
    if (error) throw error;
  },

  async markReadByKey(userId, dedupeKey) {
    const { error } = await db
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("dedupe_key", dedupeKey)
      .is("read_at", null);
    if (error) throw error;
  },
});
