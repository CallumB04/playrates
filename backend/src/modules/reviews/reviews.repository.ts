import type { Db } from "../../config/supabase.js";
import type { ReviewRow } from "../../types/database.types.js";

/** A review joined with its author and the author's log of that game. */
export interface ReviewRowJoined extends ReviewRow {
  author?: {
    id: string;
    username: string;
    picture_url: string | null;
    last_seen_at: string;
  } | null;
}

const SELECT_WITH_AUTHOR =
  "*, author:profiles!reviews_user_id_fkey(id, username, picture_url, last_seen_at)";

export interface ReviewsRepository {
  listByGame(
    gameId: number,
    viewerId: string | undefined,
    from: number,
    to: number,
  ): Promise<{ rows: ReviewRowJoined[]; total: number }>;
  listByUser(
    userId: string,
    viewerId: string | undefined,
    from: number,
    to: number,
  ): Promise<{ rows: ReviewRowJoined[]; total: number }>;
  findByUserAndGame(
    userId: string,
    gameId: number,
  ): Promise<ReviewRowJoined | null>;
  upsert(
    userId: string,
    gameId: number,
    patch: { body: string; is_public: boolean },
  ): Promise<{ row: ReviewRowJoined; created: boolean }>;
  remove(id: number): Promise<void>;
  /** Ratings for a set of (user, game) pairs, for the review list join. */
  ratingsFor(
    pairs: { userId: string; gameId: number }[],
  ): Promise<Map<string, { rating: number | null; platform: string | null }>>;
}

export const ratingKey = (userId: string, gameId: number) =>
  `${userId}:${gameId}`;

export const createReviewsRepository = (db: Db): ReviewsRepository => ({
  async listByGame(gameId, viewerId, from, to) {
    let builder = db
      .from("reviews")
      .select(SELECT_WITH_AUTHOR, { count: "exact" })
      .eq("game_id", gameId);

    // The old API never checked is_public, so private reviews were served
    // to everyone. Visible = public, or written by the viewer.
    builder = viewerId
      ? builder.or(`is_public.eq.true,user_id.eq.${viewerId}`)
      : builder.eq("is_public", true);

    const { data, error, count } = await builder
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw error;
    return { rows: (data ?? []) as ReviewRowJoined[], total: count ?? 0 };
  },

  async listByUser(userId, viewerId, from, to) {
    let builder = db
      .from("reviews")
      .select(SELECT_WITH_AUTHOR, { count: "exact" })
      .eq("user_id", userId);

    if (viewerId !== userId) builder = builder.eq("is_public", true);

    const { data, error, count } = await builder
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw error;
    return { rows: (data ?? []) as ReviewRowJoined[], total: count ?? 0 };
  },

  async findByUserAndGame(userId, gameId) {
    const { data, error } = await db
      .from("reviews")
      .select(SELECT_WITH_AUTHOR)
      .eq("user_id", userId)
      .eq("game_id", gameId)
      .maybeSingle();
    if (error) throw error;
    return (data as ReviewRowJoined | null) ?? null;
  },

  async upsert(userId, gameId, patch) {
    const existing = await this.findByUserAndGame(userId, gameId);

    if (existing) {
      const { data, error } = await db
        .from("reviews")
        .update(patch)
        .eq("id", existing.id)
        .select(SELECT_WITH_AUTHOR)
        .single();
      if (error) throw error;
      return { row: data as ReviewRowJoined, created: false };
    }

    const { data, error } = await db
      .from("reviews")
      .insert({ ...patch, user_id: userId, game_id: gameId })
      .select(SELECT_WITH_AUTHOR)
      .single();
    if (error) throw error;
    return { row: data as ReviewRowJoined, created: true };
  },

  async remove(id) {
    const { error } = await db.from("reviews").delete().eq("id", id);
    if (error) throw error;
  },

  async ratingsFor(pairs) {
    const result = new Map<
      string,
      { rating: number | null; platform: string | null }
    >();
    if (pairs.length === 0) return result;

    const userIds = [...new Set(pairs.map((p) => p.userId))];
    const gameIds = [...new Set(pairs.map((p) => p.gameId))];

    const { data, error } = await db
      .from("game_logs")
      .select("user_id, game_id, rating, platform_slug")
      .in("user_id", userIds)
      .in("game_id", gameIds);
    if (error) throw error;

    for (const row of (data ?? []) as {
      user_id: string;
      game_id: number;
      rating: number | null;
      platform_slug: string | null;
    }[]) {
      result.set(ratingKey(row.user_id, row.game_id), {
        rating: row.rating === null ? null : Number(row.rating),
        platform: row.platform_slug,
      });
    }

    return result;
  },
});
