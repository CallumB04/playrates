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
   * The view already carries the author and the rating, so this is a pure
   * mapping — it used to cost a second query per listing. A missing author
   * falls back to a placeholder: the FK should prevent it, but one bad row
   * shouldn't take down the listing.
   */
  const withAuthors = (rows: ReviewRowJoined[]): ReviewWithAuthor[] =>
    rows.map((row) => ({
      ...toReview(row),
      author: {
        id: row.user_id,
        username: row.author_username ?? "Unknown user",
        avatarUrl: row.author_avatar_url ?? null,
        online: row.author_last_seen_at
          ? isOnline(row.author_last_seen_at)
          : false,
      },
      rating: row.rating === null ? null : Number(row.rating),
      platform: row.platform_slug,
    }));

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
      return paginate(withAuthors(rows), pagination, total);
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
      return paginate(withAuthors(rows), pagination, total);
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
