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
import type { GameRow } from "../../types/database.types.js";
import type { GamesRepository } from "./games.repository.js";
import { toGame } from "./games.mapper.js";

/** Below this many local hits, a search falls through to the provider. */
const LOCAL_RESULT_THRESHOLD = 8;

export const createGamesService = (
  repo: GamesRepository,
  provider: GamesProvider,
  // One lookup, so this takes a function rather than the whole repository.
  viewerPrefs: (userId: string) => Promise<{ showSexualContent: boolean }>,
) => ({
  async getById(id: number): Promise<Game> {
    const row = await repo.findById(id);
    if (!row) throw AppError.notFound("Game");

    /* The bulk import carries neither descriptions nor credits — RAWG puts
       both on the detail endpoint only — so the first person to open a game
       pays for one fetch. Awaited, or they'd have to reload to see it. */
    if (!row.details_synced_at && row.rawg_id && provider.isConfigured) {
      const detail = await this.backfillDetails(id, row.rawg_id);
      if (detail) return toGame({ ...row, ...detail });
    }

    return toGame(row);
  },

  /**
   * Fetches and stores the fields only RAWG's detail endpoint carries,
   * returning them so this request can render them. Failures are not fatal —
   * the next view tries again.
   */
  async backfillDetails(
    id: number,
    rawgId: number,
  ): Promise<Partial<GameRow> | null> {
    try {
      const external = await provider.getById(rawgId);
      if (!external) return null;

      const fields = {
        description: external.description,
        contentTags: external.contentTags,
        hasSexualContent: external.hasSexualContent,
        developers: external.developers,
        publishers: external.publishers,
        website: external.website,
        esrbRating: external.esrbRating,
      };
      await repo.refreshFromExternal(id, fields);

      return {
        /* A game with no description keeps the one it has: the import leaves
           it empty, but a later edit or a different provider might not. */
        ...(external.description ? { description: external.description } : {}),
        developers: external.developers,
        publishers: external.publishers,
        website: external.website,
        esrb_rating: external.esrbRating,
      };
    } catch {
      return null;
    }
  },

  async list(query: GameQuery, callerId?: string): Promise<Paginated<Game>> {
    const pagination: Pagination = { page: query.page, limit: query.limit };
    const { from, to } = toRange(pagination);

    // Hidden unless the viewer opted in, so signed out always gets the default.
    const showSexualContent = callerId
      ? (await viewerPrefs(callerId)).showSexualContent
      : false;

    const { rows, total } = await repo.list(
      query,
      from,
      to,
      query.excludeLogged ? callerId : undefined,
      showSexualContent,
    );

    return paginate(rows.map(toGame), pagination, total);
  },

  async getStats(gameId: number): Promise<GameStats> {
    // confirm the game exists so a bad id is a 404, not empty stats
    await this.getById(gameId);

    const [counts, rating, own] = await Promise.all([
      repo.statusCounts(gameId),
      repo.ratingSummary(gameId),
      repo.playratesStats(gameId),
    ]);

    const logCount = Object.values(counts.byStatus).reduce((a, b) => a + b, 0);

    return {
      logCount,
      byStatus: counts.byStatus,
      byPlayedStatus: counts.byPlayedStatus,
      averageRating: rating.average,
      ratingCount: rating.count,
      ratingBuckets: rating.buckets,
      avgHoursPlayed: own.avgHoursPlayed,
      avgHoursToBeat: own.avgHoursToBeat,
      avgCompletion: own.avgCompletion,
    };
  },

  /**
   * Cache-through search: local first, then RAWG, caching what returns. Upstream
   * results are written and re-read, so the ids handed back are always ours.
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
