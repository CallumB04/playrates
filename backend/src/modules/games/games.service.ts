import {
  PULL_PAGE_SIZE,
  type AdminPullInput,
  type AdminPullResult,
  type Game,
  type GameEventSource,
  type GameQuery,
  type GameStats,
  type Paginated,
  type Pagination,
} from "@playrates/shared";
import { AppError } from "../../lib/AppError.js";
import { paginate, toRange } from "../../lib/pagination.js";
import type { GamesProvider } from "../../providers/games/GamesProvider.js";
import type { GamesRepository } from "./games.repository.js";
import type {
  GameEventDraft,
  GameEventsRepository,
} from "./gameEvents.repository.js";
import { toGame } from "./games.mapper.js";

/** Below this many local hits, a search falls through to the provider. */
const LOCAL_RESULT_THRESHOLD = 8;

/** A trending rail shorter than this looks broken rather than curated. */
const MIN_TRENDING = 6;

/* Only the first page, and only where the rail came back short: paging
   through trending, or asking for fewer than the minimum, means the caller
   wants what is actually flagged. */
const needsTopUp = (
  query: GameQuery,
  pagination: Pagination,
  found: number,
): boolean =>
  query.trending === true &&
  pagination.page === 1 &&
  found < Math.min(MIN_TRENDING, pagination.limit);

export const createGamesService = (
  repo: GamesRepository,
  provider: GamesProvider,
  // One lookup, so this takes a function rather than the whole repository.
  viewerPrefs: (userId: string) => Promise<{ showSexualContent: boolean }>,
  events: GameEventsRepository,
) => {
  /** The catalogue log is for the admin; a failure to write it is not the
   *  visitor's problem. */
  const record = async (
    event: GameEventDraft | GameEventDraft[],
  ): Promise<void> => {
    try {
      await events.record(event);
    } catch {
      // the log is best-effort
    }
  };

  const errorText = (error: unknown): string =>
    error instanceof Error ? error.message : String(error);

  /** Upserts, and says how many of those were new to the catalogue. */
  const upsertCounting = async (
    external: Awaited<ReturnType<GamesProvider["search"]>>,
  ): Promise<{ added: number; updated: number }> => {
    if (external.length === 0) return { added: 0, updated: 0 };
    const existing = new Set(
      await repo.existingIgdbIds(external.map((g) => g.externalId)),
    );
    await repo.upsertMany(external);
    const added = external.filter((g) => !existing.has(g.externalId)).length;
    return { added, updated: external.length - added };
  };

  /** Opt-in, so signed out and unknown both mean no. */
  const canSeeExplicit = async (callerId?: string): Promise<boolean> =>
    callerId ? (await viewerPrefs(callerId)).showSexualContent : false;

  return {
    async getById(id: number, callerId?: string): Promise<Game> {
      const row = await repo.findById(id);
      if (!row) throw AppError.notFound("Game");

      /* A page is a surface like any other: hiding a game from every listing
       and then serving it to anyone with the link is not hiding it. Not
       found rather than forbidden — that a game exists is the thing being
       withheld. */
      if (row.has_sexual_content && !(await canSeeExplicit(callerId))) {
        throw AppError.notFound("Game");
      }

      return toGame(row);
    },

    /**
     * Fetches a game from IGDB again and writes it over the row. Failures
     * are recorded and reported, not thrown: the row keeps what it had.
     */
    async refreshFromIgdb(
      id: number,
      igdbId: number,
      source: GameEventSource,
    ): Promise<boolean> {
      try {
        const external = await provider.getById(igdbId);
        if (!external) {
          await record({
            kind: "details_backfill_failed",
            source,
            gameId: id,
            data: { igdbId, error: "IGDB has no game with this id" },
          });
          return false;
        }
        await repo.applyExternal(id, external);
        return true;
      } catch (error) {
        await record({
          kind: "details_backfill_failed",
          source,
          gameId: id,
          data: { igdbId, error: errorText(error) },
        });
        return false;
      }
    },

    async list(query: GameQuery, callerId?: string): Promise<Paginated<Game>> {
      const pagination: Pagination = { page: query.page, limit: query.limit };
      const { from, to } = toRange(pagination);

      const showSexualContent = await canSeeExplicit(callerId);

      const { rows, total } = await repo.list(
        query,
        from,
        to,
        query.excludeLogged ? callerId : undefined,
        showSexualContent,
      );

      if (!needsTopUp(query, pagination, rows.length)) {
        return paginate(rows.map(toGame), pagination, total);
      }

      /* Trending is a hand-picked set of a handful, and a viewer's content
       filter cuts into it — so the rail arrived short for most people through
       no choice of their own. Topped up with what is most logged, which is
       how the rail beside it is ordered anyway. */
      const short = Math.min(MIN_TRENDING, pagination.limit) - rows.length;
      const { rows: candidates } = await repo.list(
        { ...query, trending: undefined, sort: "logged" },
        0,
        rows.length + short - 1,
        query.excludeLogged ? callerId : undefined,
        showSexualContent,
      );

      const already = new Set(rows.map((row) => row.id));
      const topUp = candidates
        .filter((row) => !already.has(row.id))
        .slice(0, short);

      return paginate(
        [...rows, ...topUp].map(toGame),
        pagination,
        rows.length + topUp.length,
      );
    },

    async getStats(gameId: number): Promise<GameStats> {
      // confirm the game exists so a bad id is a 404, not empty stats
      await this.getById(gameId);

      const [counts, rating, own] = await Promise.all([
        repo.statusCounts(gameId),
        repo.ratingSummary(gameId),
        repo.playratesStats(gameId),
      ]);

      const logCount = Object.values(counts.byStatus).reduce(
        (a, b) => a + b,
        0,
      );

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
     * Cache-through search: local first, then IGDB, caching what returns. Upstream
     * results are written and re-read, so the ids handed back are always ours.
     */
    async search(
      term: string,
      pagination: Pagination,
      allowRemote: boolean,
      callerId?: string,
    ): Promise<Paginated<Game>> {
      const showSexualContent = await canSeeExplicit(callerId);
      const local = await repo.searchLocal(
        term,
        pagination.limit,
        showSexualContent,
      );

      const shouldGoRemote =
        allowRemote &&
        provider.isConfigured &&
        local.length < LOCAL_RESULT_THRESHOLD;

      if (!shouldGoRemote) {
        return paginate(local.map(toGame), pagination, local.length);
      }

      /* The provider is an enrichment, not the source: an outage upstream
       used to turn every thin search into a 502 over a catalogue we already
       hold locally. */
      let external: Awaited<ReturnType<GamesProvider["search"]>> = [];
      try {
        external = await provider.search(term, 20);
      } catch (error) {
        await record({
          kind: "search_pull",
          source: "search",
          actorId: callerId,
          data: { term, failed: true, error: errorText(error) },
        });
        return paginate(local.map(toGame), pagination, local.length);
      }

      const { added } = await upsertCounting(external);
      await record({
        kind: "search_pull",
        source: "search",
        actorId: callerId,
        data: { term, fetched: external.length, added, localHits: local.length },
      });

      const refreshed = await repo.searchLocal(
        term,
        pagination.limit,
        showSexualContent,
      );
      return paginate(refreshed.map(toGame), pagination, refreshed.length);
    },

    /** Imports a specific upstream game, or returns it if already cached. */
    async importByIgdbId(
      igdbId: number,
      actor?: { id: string; source: GameEventSource },
    ): Promise<{ game: Game; created: boolean }> {
      const existing = await repo.findByIgdbId(igdbId);
      if (existing) return { game: toGame(existing), created: false };

      if (!provider.isConfigured) {
        throw AppError.notConfigured(
          "No games provider is configured. Set IGDB_CLIENT_ID and IGDB_CLIENT_SECRET to import games.",
        );
      }

      const external = await provider.getById(igdbId);
      if (!external) throw AppError.notFound("Game");

      await repo.upsertMany([external]);

      const saved = await repo.findByIgdbId(igdbId);
      if (!saved) throw AppError.internal("Game import did not persist");

      await record({
        kind: "igdb_import",
        source: actor?.source ?? "import",
        gameId: saved.id,
        actorId: actor?.id,
        data: { igdbId, title: saved.title },
      });

      return { game: toGame(saved), created: true };
    },

    /** Brings in games released in a recent window, best known first, one
     *  IGDB request a page. */
    async pullByDate(
      input: AdminPullInput,
      actorId: string,
      today = new Date(),
    ): Promise<AdminPullResult> {
      if (!provider.isConfigured) {
        throw AppError.notConfigured(
          "No games provider is configured. Set IGDB_CLIENT_ID and IGDB_CLIENT_SECRET to pull games.",
        );
      }

      const day = (offset: number): string =>
        new Date(today.getTime() + offset * 86_400_000)
          .toISOString()
          .slice(0, 10);
      const from = day(-input.windowDays);
      // Games are listed well before release; half a year ahead catches them.
      const to = input.includeUpcoming ? day(183) : day(0);

      const result: AdminPullResult = {
        pages: 0,
        fetched: 0,
        added: 0,
        updated: 0,
        hasMore: false,
      };

      try {
        for (let page = 1; page <= input.maxPages; page++) {
          const listing = await provider.listByDate({
            from,
            to,
            page,
            pageSize: PULL_PAGE_SIZE,
          });
          result.pages = page;
          result.fetched += listing.games.length;
          const counts = await upsertCounting(listing.games);
          result.added += counts.added;
          result.updated += counts.updated;
          result.hasMore = listing.hasNext;
          if (!listing.hasNext) break;
        }
      } catch (error) {
        await record({
          kind: "manual_pull",
          source: "manual_pull",
          actorId,
          data: { ...input, from, to, ...result, failed: true, error: errorText(error) },
        });
        throw error;
      }

      await record({
        kind: "manual_pull",
        source: "manual_pull",
        actorId,
        data: { ...input, from, to, ...result },
      });
      return result;
    },

    async setTrending(id: number, isTrending: boolean, actorId: string) {
      const row = await repo.findById(id);
      if (!row) throw AppError.notFound("Game");
      if (row.is_trending !== isTrending) {
        await repo.setTrending(id, isTrending);
        await record({
          kind: isTrending ? "trending_set" : "trending_cleared",
          source: "admin",
          gameId: id,
          actorId,
          data: { title: row.title },
        });
      }
    },

    /** Fetches the game from IGDB again now. */
    async resyncDetails(id: number, actorId: string): Promise<boolean> {
      const row = await repo.findById(id);
      if (!row) throw AppError.notFound("Game");
      if (!row.igdb_id) {
        throw AppError.validation("This game isn't linked to IGDB yet");
      }
      if (!provider.isConfigured) {
        throw AppError.notConfigured("No games provider is configured.");
      }

      const ok = await this.refreshFromIgdb(id, row.igdb_id, "admin");
      await record({
        kind: "details_resynced",
        source: "admin",
        gameId: id,
        actorId,
        data: { title: row.title, ok },
      });
      return ok;
    },
  };
};

export type GamesService = ReturnType<typeof createGamesService>;
