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
  /* Only the one lookup is needed, so the games service takes a function
     rather than the whole profiles repository. */
  viewerPrefs: (userId: string) => Promise<{ showSexualContent: boolean }>,
) => ({
  async getById(id: number): Promise<Game> {
    const row = await repo.findById(id);
    if (!row) throw AppError.notFound("Game");

    /* The bulk import reads the listing endpoint, which carries no
       descriptions, so the first person to open a game pays for one fetch.
       Awaited: this used to fire and forget, which meant the first visitor
       was shown a note asking them to reload the page. */
    if (!row.description_synced_at && row.rawg_id && provider.isConfigured) {
      const description = await this.backfillDescription(id, row.rawg_id);
      if (description) return toGame({ ...row, description });
    }

    return toGame(row);
  },

  /**
   * Fetches and stores one game's description, returning it so the caller can
   * render it on this request rather than the next one. Failures are not
   * fatal: a missing description is not worth failing a page render over, and
   * the next view tries again.
   */
  async backfillDescription(
    id: number,
    rawgId: number,
  ): Promise<string | null> {
    try {
      const external = await provider.getById(rawgId);
      if (!external?.description) return null;
      await repo.refreshFromExternal(id, {
        description: external.description,
        contentTags: external.contentTags,
        hasSexualContent: external.hasSexualContent,
      });
      return external.description;
    } catch {
      return null;
    }
  },

  async list(query: GameQuery, callerId?: string): Promise<Paginated<Game>> {
    const pagination: Pagination = { page: query.page, limit: query.limit };
    const { from, to } = toRange(pagination);

    /* Sexual content is hidden unless the viewer has opted in, so a signed
       out visitor always gets the default. */
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
      ratingBuckets: rating.buckets,
    };
  },

  /**
   * Cache-through search: local first, then the provider, caching what returns.
   * Upstream results are written and re-read so the ids handed back are always
   * ours — nothing downstream should see a RAWG id.
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
