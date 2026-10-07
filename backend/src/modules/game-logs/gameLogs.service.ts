import type {
  GameLog,
  GameLogCreate,
  GameLogInput,
  GameLogPatch,
  GameLogSummary,
  LogBundle,
  Paginated,
  Pagination,
  ShelfEntry,
  UserStats,
} from "@playrates/shared";
import { headlineOf, meanRating, rollupLogs } from "@playrates/shared";
import { AppError } from "../../lib/AppError.js";
import { paginate, toRange } from "../../lib/pagination.js";
import type { ProfilesRepository } from "../profiles/profiles.repository.js";
import type { GamesRepository } from "../games/games.repository.js";
import type { ReviewsRepository } from "../reviews/reviews.repository.js";
import { toReview } from "../reviews/reviews.mapper.js";
import type { GameLogsRepository, ShelfQuery } from "./gameLogs.repository.js";
import {
  toGameLog,
  toGameLogRow,
  toGameLogWithGame,
  type GameLogRowWithGame,
  type GameLogWithGame,
} from "./gameLogs.mapper.js";
import { pickLegacyLog } from "./legacyLog.js";

const severalLogs = () =>
  AppError.conflict(
    "several_logs",
    "This game has a log per platform now. Refresh to edit them.",
  );

export const createGameLogsService = (
  repo: GameLogsRepository,
  profiles: ProfilesRepository,
  games: GamesRepository,
  reviews: ReviewsRepository,
) => {
  const profileId = async (username: string): Promise<string> => {
    const profile = await profiles.findByUsername(username);
    if (!profile) throw AppError.notFound("Profile");
    return profile.id;
  };

  /* Checked only when the console changes: the catalogue can drop a console
     after a log names it, and that log should still save. A game listing no
     consoles takes any, as the editor offers them all. */
  const assertSystemOnGame = async (
    gameId: number,
    system: string | null | undefined,
    previous: string | null,
  ) => {
    if (!system || system === previous) return;
    const game = await games.findById(gameId);
    if (!game) throw AppError.notFound("Game");
    const listed = game.game_systems?.map((s) => s.system_slug) ?? [];
    if (listed.length > 0 && !listed.includes(system)) {
      throw AppError.validation("This game isn't on that platform", {
        system: ["This game isn't on that platform"],
      });
    }
  };

  const bundleFor = async (
    userId: string,
    gameId: number,
    publicOnly: boolean,
  ): Promise<LogBundle> => {
    const rows = await repo.listByUserAndGame(userId, gameId);
    const reviewRows = await reviews.listByLogs(rows.map((r) => r.id));
    const logs = rows.map(toGameLog);
    return {
      gameId,
      logs: logs.map((log) => {
        const review = reviewRows.find((r) => r.log_id === log.id);
        return {
          ...log,
          review:
            review && (!publicOnly || review.is_public)
              ? toReview(review)
              : null,
        };
      }),
      rollup: rollupLogs(logs),
    };
  };

  const shelfFor = async (
    userId: string,
    query: ShelfQuery,
    pagination: Pagination,
  ): Promise<Paginated<ShelfEntry>> => {
    const { from, to } = toRange(pagination);
    const { gameIds, total } = await repo.shelfByUser(userId, query, from, to);
    const rows = await repo.listByUserAndGames(userId, gameIds);

    const entries = gameIds.flatMap((gameId): ShelfEntry[] => {
      const mine = rows.filter((r) => r.game_id === gameId);
      const first = mine[0];
      const logs = mine.map(toGameLog);
      const rollup = rollupLogs(logs);
      if (!first || !rollup) return [];
      return [{ gameId, game: toGameLogWithGame(first).game, logs, rollup }];
    });
    return paginate(entries, pagination, total);
  };

  /** The one log a game-addressed write means, or a 409 when it can't say. */
  const legacyTarget = async (
    userId: string,
    gameId: number,
    system?: string | null,
  ): Promise<GameLogRowWithGame | null> => {
    const pick = pickLegacyLog(
      await repo.listByUserAndGame(userId, gameId),
      system,
    );
    if (pick.kind === "several") throw severalLogs();
    return pick.kind === "one" ? pick.log : null;
  };

  return {
    /* One row per log: the shelf before logs were per console. */
    async listForUsername(
      username: string,
      query: ShelfQuery,
      pagination: Pagination,
    ): Promise<Paginated<GameLogWithGame>> {
      return this.listForUser(await profileId(username), query, pagination);
    },

    async listForUser(
      userId: string,
      query: ShelfQuery,
      pagination: Pagination,
    ): Promise<Paginated<GameLogWithGame>> {
      const { from, to } = toRange(pagination);
      const { rows, total } = await repo.listByUser(userId, query, from, to);
      return paginate(rows.map(toGameLogWithGame), pagination, total);
    },

    async shelfForUser(
      userId: string,
      query: ShelfQuery,
      pagination: Pagination,
    ): Promise<Paginated<ShelfEntry>> {
      return shelfFor(userId, query, pagination);
    },

    async shelfForUsername(
      username: string,
      query: ShelfQuery,
      pagination: Pagination,
    ): Promise<Paginated<ShelfEntry>> {
      return shelfFor(await profileId(username), query, pagination);
    },

    async bundleForUser(userId: string, gameId: number): Promise<LogBundle> {
      return bundleFor(userId, gameId, false);
    },

    /** Someone's logs of a game. Their private reviews stay theirs, unless
     *  they are the one asking. */
    async bundleForUsername(
      username: string,
      gameId: number,
      viewerId: string | undefined,
    ): Promise<LogBundle> {
      const userId = await profileId(username);
      return bundleFor(userId, gameId, userId !== viewerId);
    },

    /** Every game the caller has logged, unpaginated — "have I logged this?"
     *  needs an answer that stays right past the first page. */
    async listSummariesForUser(userId: string): Promise<GameLogSummary[]> {
      const byGame = new Map<number, GameLogSummary["logs"]>();
      for (const row of await repo.summariesByUser(userId)) {
        const logs = byGame.get(row.game_id) ?? [];
        logs.push({
          id: row.id,
          system: row.system_slug,
          status: row.status as GameLog["status"],
          playedStatus: row.played_status as GameLog["playedStatus"],
          rating: row.rating === null ? null : Number(row.rating),
        });
        byGame.set(row.game_id, logs);
      }
      return [...byGame].map(([gameId, logs]) => {
        const headline = headlineOf(logs)!;
        return {
          gameId,
          status: headline.status,
          playedStatus: headline.playedStatus,
          rating: meanRating(logs.map((l) => l.rating)),
          logs,
        };
      });
    },

    async statsForUsername(
      username: string,
      year?: number,
    ): Promise<UserStats> {
      return repo.statsByUser(await profileId(username), year);
    },

    async create(userId: string, input: GameLogCreate): Promise<GameLog> {
      const { gameId, ...fields } = input;
      const game = await games.findById(gameId);
      if (!game) throw AppError.notFound("Game");
      await assertSystemOnGame(gameId, fields.system, null);
      return toGameLog(await repo.create(userId, gameId, toGameLogRow(fields)));
    },

    /** A full replace of one log, as the editor sends it. */
    async replace(
      userId: string,
      logId: number,
      input: GameLogInput,
    ): Promise<GameLog> {
      const existing = await repo.findOwn(userId, logId);
      // 404, not 403: someone else's log shouldn't be distinguishable from
      // one that doesn't exist
      if (!existing) throw AppError.notFound("Game log");
      await assertSystemOnGame(
        existing.game_id,
        input.system,
        existing.system_slug,
      );
      return toGameLog(await repo.update(existing.id, toGameLogRow(input)));
    },

    async patch(
      userId: string,
      logId: number,
      input: GameLogPatch,
    ): Promise<GameLog> {
      const existing = await repo.findOwn(userId, logId);
      if (!existing) throw AppError.notFound("Game log");
      await assertSystemOnGame(
        existing.game_id,
        input.system,
        existing.system_slug,
      );

      const patch = toGameLogRow({
        ...input,
        // status is needed to decide whether playedStatus survives
        status: input.status ?? (existing.status as GameLogInput["status"]),
      });
      // don't rewrite status if the caller didn't ask to change it
      if (input.status === undefined) delete patch.status;

      return toGameLog(await repo.update(existing.id, patch));
    },

    async remove(userId: string, logId: number): Promise<void> {
      const existing = await repo.findOwn(userId, logId);
      if (!existing) throw AppError.notFound("Game log");
      await repo.remove(existing.id);
    },

    /* By game, for clients written when a game had one log. */

    async getOwn(userId: string, gameId: number): Promise<GameLogWithGame> {
      const rows = await repo.listByUserAndGame(userId, gameId);
      const headline = headlineOf(
        rows.map((row) => ({ ...toGameLog(row), row })),
      );
      if (!headline) throw AppError.notFound("Game log");
      return toGameLogWithGame(headline.row);
    },

    async upsertOwn(
      userId: string,
      gameId: number,
      input: GameLogInput,
    ): Promise<{ log: GameLogWithGame; created: boolean }> {
      const game = await games.findById(gameId);
      if (!game) throw AppError.notFound("Game");

      const existing = await legacyTarget(userId, gameId, input.system);
      if (existing) {
        const row = await repo.update(existing.id, toGameLogRow(input));
        return { log: toGameLogWithGame(row), created: false };
      }
      try {
        const row = await repo.create(userId, gameId, toGameLogRow(input));
        return { log: toGameLogWithGame(row), created: true };
      } catch (error) {
        /* Two saves for one game in flight together both found nothing, and
           the second insert hit the unique constraint. It lost the race, not
           the write: the row exists now, so it updates it. */
        if (!(error instanceof AppError) || error.code !== "platform_taken") {
          throw error;
        }
        const winner = await legacyTarget(userId, gameId, input.system);
        if (!winner) throw error;
        const row = await repo.update(winner.id, toGameLogRow(input));
        return { log: toGameLogWithGame(row), created: false };
      }
    },

    async patchOwn(
      userId: string,
      gameId: number,
      input: GameLogPatch,
    ): Promise<GameLogWithGame> {
      const existing = await legacyTarget(userId, gameId, input.system);
      if (!existing) throw AppError.notFound("Game log");
      await this.patch(userId, existing.id, input);
      return toGameLogWithGame((await repo.findOwn(userId, existing.id))!);
    },

    async deleteOwn(userId: string, gameId: number): Promise<void> {
      const existing = await legacyTarget(userId, gameId);
      if (!existing) throw AppError.notFound("Game log");
      await repo.remove(existing.id);
    },
  };
};

export type GameLogsService = ReturnType<typeof createGameLogsService>;
