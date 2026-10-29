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
  WishlistEntry,
  WishlistPage,
  UserStats,
} from "@playrates/shared";
import {
  headlineOf,
  loggableSystems,
  meanRating,
  rollupLogs,
} from "@playrates/shared";
import { AppError } from "../../lib/AppError.js";
import { paginate, toRange } from "../../lib/pagination.js";
import type { ProfileGate } from "../profiles/profileGate.js";
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
  games: GamesRepository,
  reviews: ReviewsRepository,
  gate: ProfileGate,
) => {
  const visibleProfileId = async (
    username: string,
    viewerId: string | undefined,
  ): Promise<string> => (await gate(username, viewerId)).id;

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
    const listed = loggableSystems(
      game.game_systems?.map((s) => s.system_slug) ?? [],
    );
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
    return paginate(await entriesFor(userId, gameIds), pagination, total);
  };

  /** One entry a game, all its logs gathered, in the order of the ids. */
  const entriesFor = async (
    userId: string,
    gameIds: number[],
  ): Promise<ShelfEntry[]> => {
    const rows = await repo.listByUserAndGames(userId, gameIds);
    return gameIds.flatMap((gameId): ShelfEntry[] => {
      const mine = rows.filter((r) => r.game_id === gameId);
      const first = mine[0];
      const logs = mine.map(toGameLog);
      const rollup = rollupLogs(logs);
      if (!first || !rollup) return [];
      return [{ gameId, game: toGameLogWithGame(first).game, logs, rollup }];
    });
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
    /**
     * Someone's wishlist, whole and in their order: one entry a game, with
     * the consoles it is wished for. A filter keeps each game's own rank,
     * so #4 is #4 whether or not #3 is showing.
     */
    async wishlistForUsername(
      username: string,
      viewerId: string | undefined,
      { system, limit }: { system?: string; limit?: number },
    ): Promise<WishlistPage> {
      const userId = await visibleProfileId(username, viewerId);
      const ids = await repo.wishlistGameIds(userId);
      const entries: WishlistEntry[] = (await entriesFor(userId, ids)).map(
        (entry, i) => ({
          ...entry,
          rank: i + 1,
          consoles: [
            ...new Set(
              entry.logs
                .filter((log) => log.status === "wishlist")
                .map((log) => log.system),
            ),
          ],
        }),
      );
      const consoles = [
        ...new Set(
          entries.flatMap((e) => e.consoles).filter((c): c is string => !!c),
        ),
      ].sort();
      const shown = system
        ? entries.filter((e) => e.consoles.includes(system))
        : entries;
      return {
        data: limit ? shown.slice(0, limit) : shown,
        total: ids.length,
        consoles,
      };
    },

    /** Their whole wishlist, reordered. Every game on it and no other, so a
     *  tab left open since a game was added cannot drop it. */
    async setWishlistOrder(userId: string, gameIds: number[]): Promise<void> {
      const current = await repo.wishlistGameIds(userId);
      const wanted = new Set(gameIds);
      if (
        current.length !== gameIds.length ||
        current.some((id) => !wanted.has(id))
      ) {
        throw AppError.validation(
          "Your wishlist has changed since this page loaded. Refresh and try again.",
        );
      }
      await repo.setWishlistOrder(userId, gameIds);
    },

    /** The consoles on one of someone's shelves, to filter it by. */
    async shelfConsolesForUsername(
      username: string,
      status: string,
      viewerId: string | undefined,
    ): Promise<string[]> {
      return repo.shelfConsoles(
        await visibleProfileId(username, viewerId),
        status,
      );
    },

    /* One row per log: the shelf before logs were per console. */
    async listForUsername(
      username: string,
      query: ShelfQuery,
      pagination: Pagination,
      viewerId: string | undefined,
    ): Promise<Paginated<GameLogWithGame>> {
      return this.listForUser(
        await visibleProfileId(username, viewerId),
        query,
        pagination,
      );
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
      viewerId: string | undefined,
    ): Promise<Paginated<ShelfEntry>> {
      return shelfFor(
        await visibleProfileId(username, viewerId),
        query,
        pagination,
      );
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
      const userId = await visibleProfileId(username, viewerId);
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
      viewerId: string | undefined,
      year?: number,
    ): Promise<UserStats> {
      return repo.statsByUser(await visibleProfileId(username, viewerId), year);
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
