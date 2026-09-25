import type {
  GameLogInput,
  GameLogPatch,
  GameLogSummary,
  Paginated,
  Pagination,
  UserStats,
} from "@playrates/shared";
import { AppError } from "../../lib/AppError.js";
import { paginate, toRange } from "../../lib/pagination.js";
import type { ProfilesRepository } from "../profiles/profiles.repository.js";
import type { GamesRepository } from "../games/games.repository.js";
import type {
  GameLogsRepository,
  ShelfQuery,
} from "./gameLogs.repository.js";
import {
  toGameLogRow,
  toGameLogWithGame,
  type GameLogWithGame,
} from "./gameLogs.mapper.js";

export const createGameLogsService = (
  repo: GameLogsRepository,
  profiles: ProfilesRepository,
  games: GamesRepository,
) => ({
  async listForUsername(
    username: string,
    query: ShelfQuery,
    pagination: Pagination,
  ): Promise<Paginated<GameLogWithGame>> {
    const profile = await profiles.findByUsername(username);
    if (!profile) throw AppError.notFound("Profile");
    return this.listForUser(profile.id, query, pagination);
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

  /** Every game the caller has logged, unpaginated — "have I logged this?"
   *  needs an answer that stays right past the first page. */
  async listSummariesForUser(userId: string): Promise<GameLogSummary[]> {
    const rows = await repo.summariesByUser(userId);
    return rows.map((row) => ({
      gameId: row.game_id,
      status: row.status as GameLogSummary["status"],
      playedStatus: row.played_status as GameLogSummary["playedStatus"],
      rating: row.rating === null ? null : Number(row.rating),
    }));
  },

  async statsForUsername(username: string, year?: number): Promise<UserStats> {
    const profile = await profiles.findByUsername(username);
    if (!profile) throw AppError.notFound("Profile");

    const stats = await repo.statsByUser(profile.id, year);
    const logCount = Object.values(stats.byStatus).reduce((a, b) => a + b, 0);

    return { logCount, ...stats };
  },

  async getOwn(userId: string, gameId: number): Promise<GameLogWithGame> {
    const row = await repo.findByUserAndGame(userId, gameId);
    if (!row) throw AppError.notFound("Game log");
    return toGameLogWithGame(row);
  },

  /** Upsert on (user_id, game_id), so the client needs no create-versus-edit
   *  branch and a retry can't duplicate a log. */
  async upsertOwn(
    userId: string,
    gameId: number,
    input: GameLogInput,
  ): Promise<{ log: GameLogWithGame; created: boolean }> {
    const game = await games.findById(gameId);
    if (!game) throw AppError.notFound("Game");

    const { row, created } = await repo.upsert(
      userId,
      gameId,
      toGameLogRow(input),
    );
    return { log: toGameLogWithGame(row), created };
  },

  async patchOwn(
    userId: string,
    gameId: number,
    input: GameLogPatch,
  ): Promise<GameLogWithGame> {
    const existing = await repo.findByUserAndGame(userId, gameId);
    // 404, not 403: someone else's log shouldn't be distinguishable from one
    // that doesn't exist
    if (!existing) throw AppError.notFound("Game log");

    const patch = toGameLogRow({
      ...input,
      // status is needed to decide whether playedStatus survives
      status: input.status ?? (existing.status as GameLogInput["status"]),
    });

    // don't rewrite status if the caller didn't ask to change it
    if (input.status === undefined) delete patch.status;

    return toGameLogWithGame(await repo.update(existing.id, patch));
  },

  async deleteOwn(userId: string, gameId: number): Promise<void> {
    const existing = await repo.findByUserAndGame(userId, gameId);
    if (!existing) throw AppError.notFound("Game log");
    await repo.remove(existing.id);
  },
});

export type GameLogsService = ReturnType<typeof createGameLogsService>;
