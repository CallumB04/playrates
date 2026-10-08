import type { ReviewSort } from "@playrates/shared";
import type { Db } from "../../config/supabase.js";
import type { ReviewRow } from "../../types/database.types.js";

/**
 * A row of the review_cards view: the review, its author, and the rating from
 * the log it reviews. The view lets the rating be sorted on, which an
 * embedded log can't be.
 */
export interface ReviewRowJoined extends ReviewRow {
  rating: number | null;
  hours_played: number | null;
  status: string | null;
  played_status: string | null;
  platform_slug: string | null;
  system_slug: string | null;
  author_username: string | null;
  author_first_name: string | null;
  vote_count: number;
  author_avatar_url: string | null;
  author_accent: string | null;
  game_has_sexual_content: boolean;
  author_last_seen_at: string | null;
  game_title: string;
  game_slug: string;
  game_cover_url: string | null;
  author_profile_visibility: string | null;
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
    showSexualContent: boolean,
  ): Promise<{ rows: ReviewRowJoined[]; total: number }>;
  /** The newest of a user's reviews of a game, for clients that address
   *  reviews by game. */
  findByUserAndGame(
    userId: string,
    gameId: number,
  ): Promise<ReviewRowJoined | null>;
  findByLog(logId: number): Promise<ReviewRowJoined | null>;
  listByLogs(logIds: number[]): Promise<ReviewRowJoined[]>;
  upsertForLog(
    userId: string,
    gameId: number,
    logId: number,
    patch: { body: string; is_public: boolean; contains_spoilers: boolean },
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

  async listRecent(from, to, showSexualContent) {
    let builder = db
      .from(CARDS)
      .select("*", { count: "exact" })
      .eq("is_public", true);

    /* The front page is shown to people who went looking for neither this
       review nor this game. */
    if (!showSexualContent) {
      builder = builder.eq("game_has_sexual_content", false);
    }

    const { data, error, count } = await builder
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
      .order("updated_at", { ascending: false })
      .limit(1);
    if (error) throw error;
    return ((data ?? [])[0] as ReviewRowJoined | undefined) ?? null;
  },

  async findByLog(logId) {
    const { data, error } = await db
      .from(CARDS)
      .select("*")
      .eq("log_id", logId)
      .maybeSingle();
    if (error) throw error;
    return (data as ReviewRowJoined | null) ?? null;
  },

  async listByLogs(logIds) {
    if (logIds.length === 0) return [];
    const { data, error } = await db
      .from(CARDS)
      .select("*")
      .in("log_id", logIds);
    if (error) throw error;
    return (data ?? []) as ReviewRowJoined[];
  },

  /* Writes go to the table, then the card is read back: the view isn't
     updatable through a join, and callers want the joined shape. */
  async upsertForLog(userId, gameId, logId, patch) {
    const existing = await this.findByLog(logId);

    const { error } = existing
      ? await db.from("reviews").update(patch).eq("id", existing.id)
      : await db.from("reviews").insert({
          ...patch,
          user_id: userId,
          game_id: gameId,
          log_id: logId,
        });
    if (error) throw error;

    const row = await this.findByLog(logId);
    if (!row) throw new Error("review vanished immediately after write");
    return { row, created: !existing };
  },

  async remove(id) {
    const { error } = await db.from("reviews").delete().eq("id", id);
    if (error) throw error;
  },
});
