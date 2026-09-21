import type { GameQuery } from "@playrates/shared";
import type { Db } from "../../config/supabase.js";
import type { ExternalGame } from "../../providers/games/GamesProvider.js";
import type { GameRowWithPlatforms } from "./games.mapper.js";

export const RATING_BUCKETS = 20;

const SELECT_WITH_RELATIONS =
  "*, game_platforms(platform_slug), game_genres(genre_slug)";

export interface GameStatsRow {
  status: string;
  count: number;
}

export interface GamesRepository {
  findById(id: number): Promise<GameRowWithPlatforms | null>;
  findByRawgId(rawgId: number): Promise<GameRowWithPlatforms | null>;
  list(
    query: GameQuery,
    from: number,
    to: number,
    excludeLoggedForUser?: string,
    /** Opt-in, read from the caller's profile. Off hides flagged games. */
    showSexualContent?: boolean,
  ): Promise<{ rows: GameRowWithPlatforms[]; total: number }>;
  searchLocal(term: string, limit: number): Promise<GameRowWithPlatforms[]>;
  upsertMany(games: ExternalGame[]): Promise<number[]>;
  statusCounts(gameId: number): Promise<Record<string, number>>;
  ratingSummary(
    gameId: number,
  ): Promise<{ average: number | null; count: number; buckets: number[] }>;
  /** This site's own figures for a game, as distinct from RAWG's. */
  playratesStats(gameId: number): Promise<{
    avgHoursPlayed: number | null;
    avgHoursToBeat: number | null;
    avgCompletion: number | null;
    achievementTrackedCount: number;
  }>;
  /** Writes what the detail endpoint knows that the bulk listing didn't. The
   *  content tags ride along so the sexual-content flag re-derives per game. */
  refreshFromExternal(
    id: number,
    fields: {
      description: string;
      contentTags: string[];
      hasSexualContent: boolean;
    },
  ): Promise<void>;
  count(): Promise<number>;
}

export const createGamesRepository = (db: Db): GamesRepository => ({
  async findById(id) {
    const { data, error } = await db
      .from("games")
      .select(SELECT_WITH_RELATIONS)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return (data as GameRowWithPlatforms | null) ?? null;
  },

  async findByRawgId(rawgId) {
    const { data, error } = await db
      .from("games")
      .select(SELECT_WITH_RELATIONS)
      .eq("rawg_id", rawgId)
      .maybeSingle();
    if (error) throw error;
    return (data as GameRowWithPlatforms | null) ?? null;
  },

  async list(query, from, to, excludeLoggedForUser, showSexualContent) {
    /* Genre and platform filter through an aliased inner join. Collecting ids
       and passing them to .in() truncates at PostgREST's 1000-row cap, and
       filtering the embed directly strips a game's other genres. */
    const select = [SELECT_WITH_RELATIONS];
    if (query.genre) {
      select.push("genre_filter:game_genres!inner(genre_slug)");
    }
    if (query.platform) {
      select.push("platform_filter:game_platforms!inner(platform_slug)");
    }

    let builder = db
      .from("games")
      .select(select.join(", "), { count: "exact" });

    if (query.search) builder = builder.ilike("title", `%${query.search}%`);
    if (query.trending !== undefined) {
      builder = builder.eq("is_trending", query.trending);
    }
    if (!showSexualContent) {
      builder = builder.eq("has_sexual_content", false);
    }

    if (query.genre) {
      builder = builder.eq("genre_filter.genre_slug", query.genre);
    }

    if (query.platform) {
      builder = builder.eq("platform_filter.platform_slug", query.platform);
    }

    // "hide games I have already logged"
    if (excludeLoggedForUser) {
      const { data: logged, error: logError } = await db
        .from("game_logs")
        .select("game_id")
        .eq("user_id", excludeLoggedForUser);
      if (logError) throw logError;
      const loggedIds = (logged ?? []).map(
        (r) => (r as { game_id: number }).game_id,
      );
      if (loggedIds.length > 0) {
        builder = builder.not("id", "in", `(${loggedIds.join(",")})`);
      }
    }

    if (query.releasedAfter) {
      builder = builder.gte("release_date", query.releasedAfter);
    }
    if (query.releasedBefore) {
      builder = builder.lte("release_date", query.releasedBefore);
    }

    /* Log count is the default: this site's own figures should order it.
       RAWG's tracker count sits underneath as a hidden second key, because
       almost nothing is logged yet and log_count alone leaves a hundred
       thousand rows of zero ordered by id. It isn't offered as a sort of its
       own — somebody else's popularity figure would read as ours. */
    const desc = { ascending: false, nullsFirst: false } as const;
    switch (query.sort) {
      case "title":
        builder = builder.order("title");
        break;
      case "released":
        builder = builder.order("release_date", desc);
        break;
      case "rating":
        /* Our ratings, not RAWG's 0-5 score. The count is a second key so one
           lone 10.0 doesn't outrank a game fifty people settled at 9.2. */
        builder = builder.order("avg_rating", desc).order("rating_count", desc);
        break;
      case "metacritic":
        builder = builder.order("metacritic", desc);
        break;
      default:
        builder = builder
          .order("log_count", desc)
          .order("rawg_added_count", desc);
    }

    /* The tiebreaker is not optional. Every sort key above collides, and
       Postgres gives no stable order among equal rows — so deep paging would
       show some rows twice and skip others. */
    const { data, error, count } = await builder.order("id").range(from, to);
    if (error) throw error;
    // the select string is built at runtime, so supabase-js cannot infer it
    return {
      rows: (data ?? []) as unknown as GameRowWithPlatforms[],
      total: count ?? 0,
    };
  },

  async searchLocal(term, limit) {
    const { data, error } = await db
      .from("games")
      .select(SELECT_WITH_RELATIONS)
      .ilike("title", `%${term}%`)
      .order("rawg_added_count", { ascending: false, nullsFirst: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as GameRowWithPlatforms[];
  },

  /**
   * Upserts a batch and replaces their platform and genre links. Only writes
   * `description` when there is one: the bulk import has none, and blanking a
   * backfilled one would lose it.
   */
  async upsertMany(games) {
    if (games.length === 0) return [];

    const now = new Date().toISOString();

    const rows = games.map((g) => ({
      rawg_id: g.externalId,
      slug: g.slug,
      title: g.title,
      cover_url: g.coverUrl,
      release_date: g.releaseDate,
      has_sexual_content: g.hasSexualContent,
      content_tags: g.contentTags,
      metacritic: g.metacritic,
      rawg_rating: g.rawgRating,
      rawg_rating_count: g.rawgRatingCount,
      rawg_added_count: g.rawgAddedCount,
      playtime_hours: g.playtimeHours,
      synced_at: now,
      ...(g.description
        ? { description: g.description, description_synced_at: now }
        : {}),
    }));

    const { data, error } = await db
      .from("games")
      .upsert(rows, { onConflict: "rawg_id", ignoreDuplicates: false })
      .select("id, rawg_id");
    if (error) throw error;

    const saved = (data ?? []) as { id: number; rawg_id: number }[];
    const idByRawgId = new Map(saved.map((r) => [r.rawg_id, r.id]));
    const gameIds = saved.map((r) => r.id);
    if (gameIds.length === 0) return [];

    // any genre RAWG returns that we have not seen before
    const genres = new Map<string, string>();
    for (const g of games) {
      for (const genre of g.genres) genres.set(genre.slug, genre.name);
    }
    if (genres.size > 0) {
      const { error: genreError } = await db.from("genres").upsert(
        [...genres].map(([slug, name]) => ({ slug, name })),
        { onConflict: "slug", ignoreDuplicates: true },
      );
      if (genreError) throw genreError;
    }

    // replace the links rather than accumulating duplicates
    for (const table of ["game_platforms", "game_genres"] as const) {
      const { error: deleteError } = await db
        .from(table)
        .delete()
        .in("game_id", gameIds);
      if (deleteError) throw deleteError;
    }

    const platformLinks = games.flatMap((g) => {
      const gameId = idByRawgId.get(g.externalId);
      if (!gameId) return [];
      return g.platformSlugs.map((slug) => ({
        game_id: gameId,
        platform_slug: slug,
      }));
    });

    const genreLinks = games.flatMap((g) => {
      const gameId = idByRawgId.get(g.externalId);
      if (!gameId) return [];
      return g.genres.map((genre) => ({
        game_id: gameId,
        genre_slug: genre.slug,
      }));
    });

    if (platformLinks.length > 0) {
      const { error: linkError } = await db
        .from("game_platforms")
        .insert(platformLinks);
      if (linkError) throw linkError;
    }

    if (genreLinks.length > 0) {
      const { error: linkError } = await db
        .from("game_genres")
        .insert(genreLinks);
      if (linkError) throw linkError;
    }

    return gameIds;
  },

  /* Both aggregate in SQL. Reducing in JS means pulling every row, which
     PostgREST truncates at 1000. */
  async statusCounts(gameId) {
    const { data, error } = await db
      .rpc("game_status_counts", { p_game_id: gameId })
      .single();
    if (error) throw error;

    const row = data as {
      played: number;
      playing: number;
      backlog: number;
      wishlist: number;
    };
    return {
      played: Number(row.played),
      playing: Number(row.playing),
      backlog: Number(row.backlog),
      wishlist: Number(row.wishlist),
    };
  },

  async playratesStats(gameId) {
    const { data, error } = await db
      .rpc("game_playrates_stats", { p_game_id: gameId })
      .single();
    if (error) throw error;

    const row = data as {
      avg_hours_played: number | null;
      avg_hours_to_beat: number | null;
      avg_completion: number | null;
      achievement_tracked_count: number;
    };

    return {
      avgHoursPlayed:
        row.avg_hours_played === null ? null : Number(row.avg_hours_played),
      avgHoursToBeat:
        row.avg_hours_to_beat === null ? null : Number(row.avg_hours_to_beat),
      avgCompletion:
        row.avg_completion === null ? null : Number(row.avg_completion),
      achievementTrackedCount: Number(row.achievement_tracked_count),
    };
  },

  async ratingSummary(gameId) {
    const { data, error } = await db
      .rpc("game_rating_summary", { p_game_id: gameId })
      .single();
    if (error) throw error;

    const row = data as {
      average: number | null;
      total: number;
      buckets: number[] | null;
    };

    const count = Number(row.total);
    // Postgres returns an empty array when nothing is rated; the plate wants 20.
    const buckets = (row.buckets ?? []).map(Number);
    return {
      average: count === 0 ? null : Number(row.average),
      count,
      buckets:
        buckets.length === RATING_BUCKETS
          ? buckets
          : new Array<number>(RATING_BUCKETS).fill(0),
    };
  },

  async refreshFromExternal(id, fields) {
    const { error } = await db
      .from("games")
      .update({
        description: fields.description,
        content_tags: fields.contentTags,
        has_sexual_content: fields.hasSexualContent,
        description_synced_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw error;
  },

  async count() {
    const { count, error } = await db
      .from("games")
      .select("id", { count: "exact", head: true });
    if (error) throw error;
    return count ?? 0;
  },
});
