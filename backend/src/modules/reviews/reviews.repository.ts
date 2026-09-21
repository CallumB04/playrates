import type { ReviewSort } from "@playrates/shared";
import type { Db } from "../../config/supabase.js";
import type { ReviewRow } from "../../types/database.types.js";

/**
 * A row of the review_cards view: the review, its author, and the rating from
 * that author's log of the game. The view exists because there is no foreign
 * key from reviews to game_logs, so the rating could not be embedded — or
 * sorted on — from the table alone.
 */
export interface ReviewRowJoined extends ReviewRow {
  rating: number | null;
  hours_played: number | null;
  status: string | null;
  played_status: string | null;
  platform_slug: string | null;
  author_username: string | null;
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

    /* Unrated reviews sort last on both rating directions — they are the
       absence of an opinion, not the lowest one. */
    builder =
      sort === "rating-high"
        ? builder.order("rating", { ascending: false, nullsFirst: false })
        : sort === "rating-low"
          ? builder.order("rating", { ascending: true, nullsFirst: false })
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

  /* Writes go to the table, then the card is read back — the view is not
     updatable through a join, and the caller wants the joined shape. */
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
