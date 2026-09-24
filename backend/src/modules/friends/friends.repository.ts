import type { Db } from "../../config/supabase.js";
import type { FriendshipRow } from "../../types/database.types.js";

/** One row per relationship, user_a_id sorted before user_b_id so (a,b) and
 *  (b,a) can't both exist. Callers pass the pair in any order. */
export const orderPair = (x: string, y: string): [string, string] =>
  x < y ? [x, y] : [y, x];

export interface FriendshipWithUsers extends FriendshipRow {
  user_a?: FriendProfileRow | null;
  user_b?: FriendProfileRow | null;
}

export interface FriendProfileRow {
  id: string;
  username: string;
  avatar_url: string | null;
  accent: string | null;
  bio: string;
  last_seen_at: string;
}

const SELECT_WITH_USERS = `
    *,
    user_a:profiles!friendships_user_a_id_fkey(id, username, avatar_url, accent, bio, last_seen_at),
    user_b:profiles!friendships_user_b_id_fkey(id, username, avatar_url, accent, bio, last_seen_at)
`;

/** A row of the friend_activity view: one friend's log, flattened. */
export interface FriendActivityRow {
  log_id: number;
  user_id: string;
  game_id: number;
  status: string;
  played_status: string | null;
  rating: number | null;
  hours_played: number | null;
  updated_at: string;
  actor_username: string;
  actor_avatar_url: string | null;
  actor_accent: string | null;
  game_has_sexual_content: boolean;
  actor_last_seen_at: string;
  game_title: string;
  game_cover_url: string | null;
}

export interface FriendsRepository {
  listForUser(userId: string): Promise<FriendshipWithUsers[]>;
  /** Recent logs from everyone the viewer is friends with. */
  activityFor(
    viewerId: string,
    from: number,
    to: number,
    showSexualContent: boolean,
  ): Promise<{ rows: FriendActivityRow[]; total: number }>;
  find(x: string, y: string): Promise<FriendshipRow | null>;
  create(requesterId: string, targetId: string): Promise<FriendshipWithUsers>;
  accept(x: string, y: string): Promise<FriendshipWithUsers>;
  remove(x: string, y: string): Promise<void>;
}

export const createFriendsRepository = (db: Db): FriendsRepository => ({
  async listForUser(userId) {
    const { data, error } = await db
      .from("friendships")
      .select(SELECT_WITH_USERS)
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as FriendshipWithUsers[];
  },

  async activityFor(viewerId, from, to, showSexualContent) {
    let builder = db
      .from("friend_activity")
      .select("*", { count: "exact" })
      .eq("viewer_id", viewerId);

    // A friend's choice to log it is not the viewer's choice to see it.
    if (!showSexualContent) {
      builder = builder.eq("game_has_sexual_content", false);
    }

    const { data, error, count } = await builder
      // log_id breaks ties, or deep pages repeat and skip rows.
      .order("updated_at", { ascending: false })
      .order("log_id", { ascending: false })
      .range(from, to);
    if (error) throw error;
    return { rows: (data ?? []) as FriendActivityRow[], total: count ?? 0 };
  },

  async find(x, y) {
    const [a, b] = orderPair(x, y);
    const { data, error } = await db
      .from("friendships")
      .select("*")
      .eq("user_a_id", a)
      .eq("user_b_id", b)
      .maybeSingle();
    if (error) throw error;
    return (data as FriendshipRow | null) ?? null;
  },

  async create(requesterId, targetId) {
    const [a, b] = orderPair(requesterId, targetId);
    const { data, error } = await db
      .from("friendships")
      .insert({
        user_a_id: a,
        user_b_id: b,
        status: "pending",
        requested_by: requesterId,
      })
      .select(SELECT_WITH_USERS)
      .single();
    if (error) throw error;
    return data as FriendshipWithUsers;
  },

  async accept(x, y) {
    const [a, b] = orderPair(x, y);
    const { data, error } = await db
      .from("friendships")
      .update({ status: "accepted" })
      .eq("user_a_id", a)
      .eq("user_b_id", b)
      .select(SELECT_WITH_USERS)
      .single();
    if (error) throw error;
    return data as FriendshipWithUsers;
  },

  async remove(x, y) {
    const [a, b] = orderPair(x, y);
    const { error } = await db
      .from("friendships")
      .delete()
      .eq("user_a_id", a)
      .eq("user_b_id", b);
    if (error) throw error;
  },
});
