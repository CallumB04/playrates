import type {
  Paginated,
  Pagination,
  Review,
  ReviewInput,
  ReviewWithAuthor,
} from "@playrates/shared";
import { AppError } from "../../lib/AppError.js";
import { paginate, toRange } from "../../lib/pagination.js";
import { isOnline } from "../profiles/profiles.mapper.js";
import type { ProfilesRepository } from "../profiles/profiles.repository.js";
import type { GamesRepository } from "../games/games.repository.js";
import {
  ratingKey,
  type ReviewRowJoined,
  type ReviewsRepository,
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
   * Attaches the author and their rating for the game. The old endpoint did
   * `reviewer.username` with no null guard, so one deleted user returned a
   * 500 for the entire game page; the foreign key now makes a missing author
   * impossible, and this still degrades gracefully if one appears.
   */
  const withAuthors = async (
    rows: ReviewRowJoined[],
  ): Promise<ReviewWithAuthor[]> => {
    const ratings = await repo.ratingsFor(
      rows.map((r) => ({ userId: r.user_id, gameId: r.game_id })),
    );

    return rows.map((row) => {
      const log = ratings.get(ratingKey(row.user_id, row.game_id));
      return {
        ...toReview(row),
        author: {
          id: row.author?.id ?? row.user_id,
          username: row.author?.username ?? "Unknown user",
          pictureUrl: row.author?.picture_url ?? null,
          online: row.author ? isOnline(row.author.last_seen_at) : false,
        },
        rating: log?.rating ?? null,
        platform: log?.platform ?? null,
      };
    });
  };

  return {
    async listByGame(
      gameId: number,
      viewerId: string | undefined,
      pagination: Pagination,
    ): Promise<Paginated<ReviewWithAuthor>> {
      const game = await games.findById(gameId);
      if (!game) throw AppError.notFound("Game");

      const { from, to } = toRange(pagination);
      const { rows, total } = await repo.listByGame(gameId, viewerId, from, to);
      return paginate(await withAuthors(rows), pagination, total);
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
      return paginate(await withAuthors(rows), pagination, total);
    },

    async getOwn(userId: string, gameId: number): Promise<Review> {
      const row = await repo.findByUserAndGame(userId, gameId);
      if (!row) throw AppError.notFound("Review");
      return toReview(row);
    },

    /** The write path the old API simply did not have. */
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
