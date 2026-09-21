import type { ReviewSort } from "@playrates/shared";
import type { Db } from "../../config/supabase.js";
import type { ReviewRow } from "../../types/database.types.js";

/**
 * A row of the review_cards view: the review, its author, and the rating from
 * that author's log. The view exists because there is no foreign key from
 * reviews to game_logs, so the rating can't be embedded or sorted on.
 */
export interface ReviewRowJoined extends ReviewRow {
  rating: number | null;
  hours_played: number | null;
  status: string | null;
  played_status: string | null;
  platform_slug: string | null;
  author_username: string | null;
  author_first_name: string | null;
  vote_count: number;
  author_avatar_url: string | null;
  author_last_seen_at: string | null;
  game_title: string;
  game_slug: string;
  game_cover_url: string | null;
}

const CARDS = "review_cards";

export interface ReviewsRepository {
  listByGame(
    gameId: number,
    viewerId: string | undefined,
    from: number,
    to: number,
    sort?: ReviewSort,
  ): Promise<{ rows: ReviewRowJoined[]; total: number }>;
  listByUser(
    userId: string,
    viewerId: string | undefined,
    from: number,
    to: number,
  ): Promise<{ rows: ReviewRowJoined[]; total: number }>;
  /** Public reviews across every game, newest first. */
  listRecent(
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
  findById(id: number): Promise<ReviewRowJoined | null>;
  /** Which of these reviews the viewer has already voted on. */
  votedReviewIds(userId: string, reviewIds: number[]): Promise<Set<number>>;
  hasVoted(userId: string, reviewId: number): Promise<boolean>;
  addVote(userId: string, reviewId: number): Promise<void>;
  removeVote(userId: string, reviewId: number): Promise<void>;
  voteCount(reviewId: number): Promise<number>;
}

export const createReviewsRepository = (db: Db): ReviewsRepository => ({
  async listByGame(gameId, viewerId, from, to, sort = "recent") {
    let builder = db
      .from(CARDS)
      .select("*", { count: "exact" })
      .eq("game_id", gameId);

    // visible when public, or when the viewer is the author
    builder = viewerId
      ? builder.or(`is_public.eq.true,user_id.eq.${viewerId}`)
      : builder.eq("is_public", true);

    // Unrated sorts last both ways: no opinion isn't the lowest one.
    builder =
      sort === "rating-high"
        ? builder.order("rating", { ascending: false, nullsFirst: false })
        : sort === "rating-low"
          ? builder.order("rating", { ascending: true, nullsFirst: false })
          : sort === "helpful"
            ? // Ties broken by recency, so a wall of zero-vote reviews is
              // still in a sensible order rather than by id.
              builder
                .order("vote_count", { ascending: false })
                .order("created_at", { ascending: false })
            : builder.order("created_at", { ascending: sort === "oldest" });

    const { data, error, count } = await builder.order("id").range(from, to);
    if (error) throw error;
    return { rows: (data ?? []) as ReviewRowJoined[], total: count ?? 0 };
  },

  async listByUser(userId, viewerId, from, to) {
    let builder = db
      .from(CARDS)
      .select("*", { count: "exact" })
      .eq("user_id", userId);

    if (viewerId !== userId) builder = builder.eq("is_public", true);

    const { data, error, count } = await builder
      .order("created_at", { ascending: false })
      .order("id")
      .range(from, to);
    if (error) throw error;
    return { rows: (data ?? []) as ReviewRowJoined[], total: count ?? 0 };
  },

  async listRecent(from, to) {
    const { data, error, count } = await db
      .from(CARDS)
      .select("*", { count: "exact" })
      .eq("is_public", true)
      // id breaks ties, or deep pages repeat and skip rows.
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, to);
    if (error) throw error;
    return { rows: (data ?? []) as ReviewRowJoined[], total: count ?? 0 };
  },

  async findById(id) {
    const { data, error } = await db
      .from(CARDS)
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return (data as ReviewRowJoined | null) ?? null;
  },

  async votedReviewIds(userId, reviewIds) {
    const { data, error } = await db
      .from("review_votes")
      .select("review_id")
      .eq("user_id", userId)
      .in("review_id", reviewIds);
    if (error) throw error;
    return new Set(
      (data ?? []).map((r) => (r as { review_id: number }).review_id),
    );
  },

  async hasVoted(userId, reviewId) {
    const { count, error } = await db
      .from("review_votes")
      .select("review_id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("review_id", reviewId);
    if (error) throw error;
    return (count ?? 0) > 0;
  },

  async addVote(userId, reviewId) {
    const { error } = await db
      .from("review_votes")
      .upsert(
        { user_id: userId, review_id: reviewId },
        { onConflict: "review_id,user_id" },
      );
    if (error) throw error;
  },

  async removeVote(userId, reviewId) {
    const { error } = await db
      .from("review_votes")
      .delete()
      .eq("user_id", userId)
      .eq("review_id", reviewId);
    if (error) throw error;
  },

  async voteCount(reviewId) {
    const { count, error } = await db
      .from("review_votes")
      .select("review_id", { count: "exact", head: true })
      .eq("review_id", reviewId);
    if (error) throw error;
    return count ?? 0;
  },

  async findByUserAndGame(userId, gameId) {
    const { data, error } = await db
      .from(CARDS)
      .select("*")
      .eq("user_id", userId)
      .eq("game_id", gameId)
      .maybeSingle();
    if (error) throw error;
    return (data as ReviewRowJoined | null) ?? null;
  },

  /* Writes go to the table, then the card is read back: the view isn't
     updatable through a join, and callers want the joined shape. */
  async upsert(userId, gameId, patch) {
    const existing = await this.findByUserAndGame(userId, gameId);

    const { error } = existing
      ? await db.from("reviews").update(patch).eq("id", existing.id)
      : await db
          .from("reviews")
          .insert({ ...patch, user_id: userId, game_id: gameId });
    if (error) throw error;

    const row = await this.findByUserAndGame(userId, gameId);
    if (!row) throw new Error("review vanished immediately after write");
    return { row, created: !existing };
  },

  async remove(id) {
    const { error } = await db.from("reviews").delete().eq("id", id);
    if (error) throw error;
  },
});
