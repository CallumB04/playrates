import type {
  Paginated,
  Pagination,
  Review,
  ReviewInput,
  ReviewWithAuthor,
} from "@playrates/shared";
import type { ReviewSort } from "@playrates/shared";
import { AppError } from "../../lib/AppError.js";
import { paginate, toRange } from "../../lib/pagination.js";
import { isOnline } from "../profiles/profiles.mapper.js";
import type { ProfilesRepository } from "../profiles/profiles.repository.js";
import type { GamesRepository } from "../games/games.repository.js";
import type {
  ReviewRowJoined,
  ReviewsRepository,
} from "./reviews.repository.js";

const toReview = (row: ReviewRowJoined): Review => ({
  id: row.id,
  gameId: row.game_id,
  body: row.body,
  isPublic: row.is_public,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const createReviewsService = (
  repo: ReviewsRepository,
  profiles: ProfilesRepository,
  games: GamesRepository,
) => {
  /**
   * The view carries the author and the rating, so this is a pure mapping. A
   * missing author falls back to a placeholder — the FK should prevent it, but
   * one bad row shouldn't take down the listing.
   */
  /** Per-viewer, so it can't live on the view. One query for the page rather
   *  than one per review. */
  const withAuthors = (
    rows: ReviewRowJoined[],
    votedIds: Set<number> = new Set(),
  ): ReviewWithAuthor[] =>
    rows.map((row) => ({
      ...toReview(row),
      author: {
        id: row.user_id,
        username: row.author_username ?? "Unknown user",
        firstName: row.author_first_name,
        avatarUrl: row.author_avatar_url ?? null,
        online: row.author_last_seen_at
          ? isOnline(row.author_last_seen_at)
          : false,
      },
      rating: row.rating === null ? null : Number(row.rating),
      hoursPlayed: row.hours_played === null ? null : Number(row.hours_played),
      status: row.status,
      playedStatus: row.played_status,
      platform: row.platform_slug,
      game: {
        id: row.game_id,
        title: row.game_title,
        coverUrl: row.game_cover_url,
      },
      voteCount: Number(row.vote_count ?? 0),
      votedByViewer: votedIds.has(row.id),
    }));

  const votesFor = async (
    viewerId: string | undefined,
    rows: ReviewRowJoined[],
  ): Promise<Set<number>> => {
    if (!viewerId || rows.length === 0) return new Set();
    return repo.votedReviewIds(
      viewerId,
      rows.map((r) => r.id),
    );
  };

  return {
    async listByGame(
      gameId: number,
      viewerId: string | undefined,
      pagination: Pagination,
      sort?: ReviewSort,
    ): Promise<Paginated<ReviewWithAuthor>> {
      const game = await games.findById(gameId);
      if (!game) throw AppError.notFound("Game");

      const { from, to } = toRange(pagination);
      const { rows, total } = await repo.listByGame(
        gameId,
        viewerId,
        from,
        to,
        sort,
      );
      return paginate(
        withAuthors(rows, await votesFor(viewerId, rows)),
        pagination,
        total,
      );
    },

    async listByUsername(
      username: string,
      viewerId: string | undefined,
      pagination: Pagination,
    ): Promise<Paginated<ReviewWithAuthor>> {
      const profile = await profiles.findByUsername(username);
      if (!profile) throw AppError.notFound("Profile");

      const { from, to } = toRange(pagination);
      const { rows, total } = await repo.listByUser(
        profile.id,
        viewerId,
        from,
        to,
      );
      return paginate(
        withAuthors(rows, await votesFor(viewerId, rows)),
        pagination,
        total,
      );
    },

    /** The site-wide feed. Public reviews only, newest first. */
    async listRecent(
      pagination: Pagination,
      viewerId?: string,
    ): Promise<Paginated<ReviewWithAuthor>> {
      const { from, to } = toRange(pagination);
      const { rows, total } = await repo.listRecent(from, to);
      return paginate(
        withAuthors(rows, await votesFor(viewerId, rows)),
        pagination,
        total,
      );
    },

    /** Idempotent by primary key: a duplicate vote collides on
     *  (review_id, user_id) rather than counting twice. */
    async toggleVote(
      userId: string,
      reviewId: number,
    ): Promise<{ voteCount: number; votedByViewer: boolean }> {
      const review = await repo.findById(reviewId);
      if (!review) throw AppError.notFound("Review");

      const voted = await repo.hasVoted(userId, reviewId);
      if (voted) await repo.removeVote(userId, reviewId);
      else await repo.addVote(userId, reviewId);

      return {
        voteCount: await repo.voteCount(reviewId),
        votedByViewer: !voted,
      };
    },

    async getOwn(userId: string, gameId: number): Promise<Review> {
      const row = await repo.findByUserAndGame(userId, gameId);
      if (!row) throw AppError.notFound("Review");
      return toReview(row);
    },

    async upsertOwn(
      userId: string,
      gameId: number,
      input: ReviewInput,
    ): Promise<{ review: Review; created: boolean }> {
      const game = await games.findById(gameId);
      if (!game) throw AppError.notFound("Game");

      const { row, created } = await repo.upsert(userId, gameId, {
        body: input.body,
        is_public: input.isPublic,
      });
      return { review: toReview(row), created };
    },

    async deleteOwn(userId: string, gameId: number): Promise<void> {
      const existing = await repo.findByUserAndGame(userId, gameId);
      if (!existing) throw AppError.notFound("Review");
      await repo.remove(existing.id);
    },
  };
};

export type ReviewsService = ReturnType<typeof createReviewsService>;
