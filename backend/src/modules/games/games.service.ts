import type {
  Game,
  GameQuery,
  GameStats,
  Paginated,
  Pagination,
} from "@playrates/shared";
import { AppError } from "../../lib/AppError.js";
import { paginate, toRange } from "../../lib/pagination.js";
import type { GamesProvider } from "../../providers/games/GamesProvider.js";
import type { GamesRepository } from "./games.repository.js";
import { toGame } from "./games.mapper.js";

/** Below this many local hits, a search falls through to the provider. */
const LOCAL_RESULT_THRESHOLD = 8;

export const createGamesService = (
  repo: GamesRepository,
  provider: GamesProvider,
) => ({
  async getById(id: number): Promise<Game> {
    const row = await repo.findById(id);
    if (!row) throw AppError.notFound("Game");
    return toGame(row);
  },

  async list(query: GameQuery, callerId?: string): Promise<Paginated<Game>> {
    const pagination: Pagination = { page: query.page, limit: query.limit };
    const { from, to } = toRange(pagination);

    const { rows, total } = await repo.list(
      query,
      from,
      to,
      query.excludeLogged ? callerId : undefined,
    );

    return paginate(rows.map(toGame), pagination, total);
  },

  async getStats(gameId: number): Promise<GameStats> {
    // confirm the game exists so a bad id is a 404, not empty stats
    await this.getById(gameId);

    const [byStatus, rating] = await Promise.all([
      repo.statusCounts(gameId),
      repo.ratingSummary(gameId),
    ]);

    const logCount = Object.values(byStatus).reduce((a, b) => a + b, 0);

    return {
      logCount,
      byStatus,
      averageRating: rating.average,
      ratingCount: rating.count,
    };
  },

  /**
   * Cache-through search.
   *
   * The upstream results are written to our own table and then re-read, so
   * the ids returned are always internal ones. Returning a RAWG id where the
   * rest of the app expects a game id would be a subtle and nasty bug.
   */
  async search(
    term: string,
    pagination: Pagination,
    allowRemote: boolean,
  ): Promise<Paginated<Game>> {
    const local = await repo.searchLocal(term, pagination.limit);

    const shouldGoRemote =
      allowRemote &&
      provider.isConfigured &&
      local.length < LOCAL_RESULT_THRESHOLD;

    if (!shouldGoRemote) {
      return paginate(local.map(toGame), pagination, local.length);
    }

    const external = await provider.search(term, 20);
    if (external.length > 0) {
      await repo.upsertMany(external);
    }

    const refreshed = await repo.searchLocal(term, pagination.limit);
    return paginate(refreshed.map(toGame), pagination, refreshed.length);
  },

  /** Imports a specific upstream game, or returns it if already cached. */
  async importByRawgId(
    rawgId: number,
  ): Promise<{ game: Game; created: boolean }> {
    const existing = await repo.findByRawgId(rawgId);
    if (existing) return { game: toGame(existing), created: false };

    if (!provider.isConfigured) {
      throw AppError.notConfigured(
        "No games provider is configured. Set RAWG_API_KEY to import games.",
      );
    }

    const external = await provider.getById(rawgId);
    if (!external) throw AppError.notFound("Game");

    await repo.upsertMany([external]);

    const saved = await repo.findByRawgId(rawgId);
    if (!saved) throw AppError.internal("Game import did not persist");

    return { game: toGame(saved), created: true };
  },
});

export type GamesService = ReturnType<typeof createGamesService>;
