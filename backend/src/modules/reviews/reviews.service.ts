import type {
  Paginated,
  Pagination,
  Review,
  ReviewInput,
  ReviewWithAuthor,
} from "@playrates/shared";
import type { ReviewSort } from "@playrates/shared";
import { canSeeProfile, isUpvoteMilestone } from "@playrates/shared";
import type { NotificationsRepository } from "../notifications/notifications.repository.js";
import { reviewUpvotesKey } from "../notifications/notifications.mapper.js";
import { AppError } from "../../lib/AppError.js";
import { paginate, toRange } from "../../lib/pagination.js";
import {
  isOnline,
  toAccent,
  toProfileVisibility,
} from "../profiles/profiles.mapper.js";
import type { ProfilesRepository } from "../profiles/profiles.repository.js";
import type { GamesRepository } from "../games/games.repository.js";
import type { GameLogsRepository } from "../game-logs/gameLogs.repository.js";
import { pickLegacyLog } from "../game-logs/legacyLog.js";
import { toReview } from "./reviews.mapper.js";
import type { ProfileGate } from "../profiles/profileGate.js";
import type { FriendsRepository } from "../friends/friends.repository.js";
import type {
  ReviewRowJoined,
  ReviewsRepository,
} from "./reviews.repository.js";

const severalLogs = () =>
  AppError.conflict(
    "several_logs",
    "This game has a log per platform now. Refresh to edit them.",
  );

export const createReviewsService = (
  repo: ReviewsRepository,
  profiles: ProfilesRepository,
  games: GamesRepository,
  gameLogs: GameLogsRepository,
  notifications: NotificationsRepository,
  gate: ProfileGate,
  friends: FriendsRepository,
) => {
  /** Opt-in, so signed out and unknown both mean no. */
  const canSeeExplicit = async (viewerId?: string): Promise<boolean> =>
    viewerId
      ? ((await profiles.findById(viewerId))?.show_sexual_content ?? false)
      : false;

  /**
   * The view carries the author and the rating, so this is a pure mapping. A
   * missing author falls back to a placeholder — the FK should prevent it, but
   * one bad row shouldn't take down the listing.
   */
  /** The authors among these rows whose profiles the viewer may see. One
   *  friends lookup for the page, and only when a friends-only author is on
   *  it. */
  const visibleAuthors = async (
    viewerId: string | undefined,
    rows: ReviewRowJoined[],
  ): Promise<Set<string>> => {
    const visible = new Set<string>();
    const friendsOnly: string[] = [];
    for (const row of rows) {
      const visibility = toProfileVisibility(
        row.author_profile_visibility ?? undefined,
      );
      const isOwner = row.user_id === viewerId;
      if (canSeeProfile(visibility, { isOwner, isFriend: false })) {
        visible.add(row.user_id);
      } else if (visibility === "friends" && viewerId) {
        friendsOnly.push(row.user_id);
      }
    }
    if (viewerId && friendsOnly.length > 0) {
      const accepted = new Set(
        (await friends.listForUser(viewerId))
          .filter((f) => f.status === "accepted")
          .map((f) => (f.user_a_id === viewerId ? f.user_b_id : f.user_a_id)),
      );
      for (const id of friendsOnly) if (accepted.has(id)) visible.add(id);
    }
    return visible;
  };

  /** Per-viewer, so it can't live on the view. One query for the page rather
   *  than one per review. */
  const withAuthors = (
    rows: ReviewRowJoined[],
    votedIds: Set<number>,
    visible: Set<string>,
  ): ReviewWithAuthor[] =>
    rows.map((row) => {
      const shown = visible.has(row.user_id);
      return {
        ...toReview(row),
        author: shown
          ? {
              id: row.user_id,
              username: row.author_username ?? "Unknown user",
              firstName: row.author_first_name,
              avatarUrl: row.author_avatar_url ?? null,
              accent: toAccent(row.author_accent),
              online: row.author_last_seen_at
                ? isOnline(row.author_last_seen_at)
                : false,
            }
          : null,
        // The verdict stays with the review; the log behind it is profile.
        rating: row.rating === null ? null : Number(row.rating),
        hoursPlayed:
          shown && row.hours_played !== null ? Number(row.hours_played) : null,
        status: shown ? row.status : null,
        playedStatus: shown ? row.played_status : null,
        platform: shown ? row.platform_slug : null,
        system: shown ? row.system_slug : null,
        game: {
          id: row.game_id,
          title: row.game_title,
          coverUrl: row.game_cover_url,
        },
        voteCount: Number(row.vote_count ?? 0),
        votedByViewer: votedIds.has(row.id),
      };
    });

  /** The page's votes and visible authors, side by side. */
  const present = async (
    viewerId: string | undefined,
    rows: ReviewRowJoined[],
  ): Promise<ReviewWithAuthor[]> => {
    const [voted, visible] = await Promise.all([
      votesFor(viewerId, rows),
      visibleAuthors(viewerId, rows),
    ]);
    return withAuthors(rows, voted, visible);
  };

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
      return paginate(await present(viewerId, rows), pagination, total);
    },

    async listByUsername(
      username: string,
      viewerId: string | undefined,
      pagination: Pagination,
    ): Promise<Paginated<ReviewWithAuthor>> {
      const profile = await gate(username, viewerId);

      const { from, to } = toRange(pagination);
      const { rows, total } = await repo.listByUser(
        profile.id,
        viewerId,
        from,
        to,
      );
      return paginate(await present(viewerId, rows), pagination, total);
    },

    /** The site-wide feed. Public reviews only, newest first. */
    async listRecent(
      pagination: Pagination,
      viewerId?: string,
    ): Promise<Paginated<ReviewWithAuthor>> {
      const { from, to } = toRange(pagination);
      const { rows, total } = await repo.listRecent(
        from,
        to,
        await canSeeExplicit(viewerId),
      );
      return paginate(await present(viewerId, rows), pagination, total);
    },

    /** Idempotent by primary key: a duplicate vote collides on
     *  (review_id, user_id) rather than counting twice. */
    async toggleVote(
      userId: string,
      reviewId: number,
    ): Promise<{ voteCount: number; votedByViewer: boolean }> {
      const review = await repo.findById(reviewId);
      if (!review) throw AppError.notFound("Review");
      // A vote says someone else found it useful; the author always does.
      if (review.user_id === userId) {
        throw AppError.forbidden("You cannot upvote your own review");
      }

      const voted = await repo.hasVoted(userId, reviewId);
      if (voted) await repo.removeVote(userId, reviewId);
      else await repo.addVote(userId, reviewId);
      const voteCount = await repo.voteCount(reviewId);

      if (!voted && isUpvoteMilestone(voteCount)) {
        await notifications.raiseMilestone(
          review.user_id,
          "review_upvote_milestone",
          reviewUpvotesKey(reviewId),
          voteCount,
          {
            reviewId,
            gameId: review.game_id,
            gameTitle: review.game_title,
            coverUrl: review.game_cover_url,
          },
        );
      }

      return { voteCount, votedByViewer: !voted };
    },

    /** The review on one of the caller's logs. */
    async getForLog(userId: string, logId: number): Promise<Review> {
      const row = await repo.findByLog(logId);
      if (!row || row.user_id !== userId) throw AppError.notFound("Review");
      return toReview(row);
    },

    /* A review is written from a log and shown beside its rating and hours,
       and it goes when the log does. 404 rather than 403 on someone else's
       log: it shouldn't be told apart from one that doesn't exist. */
    async upsertForLog(
      userId: string,
      logId: number,
      input: ReviewInput,
    ): Promise<{ review: Review; created: boolean }> {
      const log = await gameLogs.findOwn(userId, logId);
      if (!log) throw AppError.notFound("Game log");

      const { row, created } = await repo.upsertForLog(
        userId,
        log.game_id,
        log.id,
        {
          body: input.body,
          is_public: input.isPublic,
          contains_spoilers: input.containsSpoilers,
        },
      );
      return { review: toReview(row), created };
    },

    async deleteForLog(userId: string, logId: number): Promise<void> {
      const existing = await repo.findByLog(logId);
      if (!existing || existing.user_id !== userId) {
        throw AppError.notFound("Review");
      }
      await repo.remove(existing.id);
    },

    /* By game, from clients written when a game had one log. */
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

      const pick = pickLegacyLog(
        await gameLogs.listByUserAndGame(userId, gameId),
      );
      if (pick.kind === "none") {
        throw AppError.validation("Log this game before reviewing it");
      }
      if (pick.kind === "several") throw severalLogs();
      return this.upsertForLog(userId, pick.log.id, input);
    },

    async deleteOwn(userId: string, gameId: number): Promise<void> {
      const pick = pickLegacyLog(
        await gameLogs.listByUserAndGame(userId, gameId),
      );
      if (pick.kind === "several") throw severalLogs();
      const existing =
        pick.kind === "one" ? await repo.findByLog(pick.log.id) : null;
      if (!existing) throw AppError.notFound("Review");
      await repo.remove(existing.id);
    },
  };
};

export type ReviewsService = ReturnType<typeof createReviewsService>;
