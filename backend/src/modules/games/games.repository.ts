import type { GameBackdrop, GameQuery } from "@playrates/shared";
import type { Db } from "../../config/supabase.js";
import { memoFor } from "../../lib/memo.js";
import { matchesFromStart, searchWords } from "../../lib/searchKey.js";
import { likePrefix, likeTerm } from "../../lib/likeTerm.js";
import type { ExternalGame } from "../../providers/games/GamesProvider.js";
import type { GameRowWithPlatforms } from "./games.mapper.js";

export const RATING_BUCKETS = 20;

/** UTC, which is what release_date is stored in. */
const today = (): string => new Date().toISOString().slice(0, 10);

const SELECT_WITH_RELATIONS =
  "*, game_platforms(platform_slug), game_systems(system_slug), game_genres(genre_slug)";

export interface GameStatsRow {
  status: string;
  count: number;
}

export interface GamesRepository {
  findById(id: number): Promise<GameRowWithPlatforms | null>;
  findByIgdbId(igdbId: number): Promise<GameRowWithPlatforms | null>;
  /** In no particular order; ids with no game are left out. */
  findByIds(ids: number[]): Promise<GameRowWithPlatforms[]>;
  list(
    query: GameQuery,
    from: number,
    to: number,
    excludeLoggedForUser?: string,
    /** Opt-in, read from the caller's profile. Off hides flagged games. */
    showSexualContent?: boolean,
  ): Promise<{
    rows: GameRowWithPlatforms[];
    total: number;
    /** Nothing matched the search, and these are the titles nearest it. */
    approximate?: boolean;
  }>;
  /** Ranked best first. `exact` is how many matched outright rather than
   *  by being close to what was typed. */
  searchLocal(
    term: string,
    limit: number,
    showSexualContent: boolean,
  ): Promise<{ rows: GameRowWithPlatforms[]; exact: number }>;
  upsertMany(games: ExternalGame[]): Promise<number[]>;
  /** Keeps a game's pictures once fetched, so IGDB is asked once a game. */
  setBackdrops(id: number, backdrops: GameBackdrop[]): Promise<void>;
  statusCounts(gameId: number): Promise<{
    byStatus: Record<string, number>;
    byPlayedStatus: Record<string, number>;
  }>;
  ratingSummary(
    gameId: number,
  ): Promise<{ average: number | null; count: number; buckets: number[] }>;
  /** This site's own figures for a game, as distinct from IGDB's. */
  playratesStats(gameId: number): Promise<{
    avgHoursPlayed: number | null;
    avgHoursToBeat: number | null;
    avgCompletion: number | null;
    achievementTrackedCount: number;
  }>;
  /**
   * Writes an upstream game onto a row that already exists, by our id. How a
   * game from before IGDB becomes an IGDB one without losing the logs,
   * reviews and threads that point at it.
   */
  applyExternal(id: number, game: ExternalGame): Promise<void>;
  count(): Promise<number>;
  /** Which of these upstream ids are already in the catalogue. */
  existingIgdbIds(igdbIds: number[]): Promise<number[]>;
  /** Games of a series, best known first, leaving one game out. Spin-offs
   *  share a series with the main games, and by date a card game or a
   *  racing side-game would sit beside the numbered ones. */
  listSeries(
    seriesId: number,
    exceptId: number,
    limit: number,
    showSexualContent: boolean,
  ): Promise<GameRowWithPlatforms[]>;
  /** A developer's games, best known first, leaving some out. */
  listByDeveloper(
    developer: string,
    exceptIds: number[],
    limit: number,
    showSexualContent: boolean,
  ): Promise<GameRowWithPlatforms[]>;
  /** Whichever of these IGDB ids are in the catalogue, in the order given. */
  listByIgdbIds(
    igdbIds: number[],
    showSexualContent: boolean,
  ): Promise<GameRowWithPlatforms[]>;
  setTrending(id: number, isTrending: boolean): Promise<void>;
  /** Makes exactly these games trending, ranked in the order given. */
  replaceTrending(ids: number[]): Promise<void>;
}

/**
 * Matches by the rules in lib/gameMatch.ts: the search key within the title
 * or one of the game's other names, or every word of it within the title. A
 * term of nothing but punctuation has no key, and falls back to the title.
 */
const matchTitle = <
  B extends {
    ilike: (column: string, pattern: string) => B;
    like: (column: string, pattern: string) => B;
    or: (filters: string) => B;
  },
>(
  builder: B,
  term: string,
): B => {
  const words = searchWords(term);
  const key = words.join("");
  if (!key) return builder.ilike("title", likeTerm(term));
  // The key is lower case already, so LIKE, which the prefix index serves.
  if (matchesFromStart(key)) {
    return builder.like("search_title", likePrefix(key));
  }
  // Keys are a-z and 0-9 alone, so nothing here needs quoting.
  const anyOrder =
    words.length > 1
      ? [`and(${words.map((w) => `search_title.like.*${w}*`).join(",")})`]
      : [];
  return builder.or(
    [
      `search_title.like.*${key}*`,
      `search_alt.like.*${key}*`,
      ...anyOrder,
    ].join(","),
  );
};

/** What public.search_games returns as the tier of a typo match. */
const CLOSE_TIER = 3;

/** Fewer library matches than this, and typo matches join them. */
const THIN_RESULTS = 8;

/** Every column an upstream game decides. Ours (log counts, ratings, the
 *  trending flag) are left alone. */
const toRow = (g: ExternalGame, now: string) => ({
  igdb_id: g.externalId,
  slug: g.slug,
  title: g.title,
  // An empty one keeps whatever the game had rather than wiping it.
  ...(g.description ? { description: g.description } : {}),
  cover_url: g.coverUrl,
  box_art_url: g.boxArtUrl,
  banner_url: g.bannerUrl,
  release_date: g.releaseDate,
  has_sexual_content: g.hasSexualContent,
  developers: g.developers,
  publishers: g.publishers,
  website: g.website,
  esrb_rating: g.esrbRating,
  critic_score: g.criticScore,
  igdb_rating_count: g.igdbRatingCount,
  similar_igdb_ids: g.similarIds,
  series_id: g.series?.id ?? null,
  series_name: g.series?.name ?? null,
  alt_covers: g.altCovers,
  alt_names: g.altNames,
  synced_at: now,
});

/** Swaps each game's platform, system and genre links for the upstream
 *  ones, adding any genre not seen before. */
const replaceLinks = async (
  db: Db,
  games: { id: number; game: ExternalGame }[],
): Promise<void> => {
  if (games.length === 0) return;
  const gameIds = games.map((g) => g.id);

  const genres = new Map<string, string>();
  for (const { game } of games) {
    for (const genre of game.genres) genres.set(genre.slug, genre.name);
  }
  if (genres.size > 0) {
    const { error } = await db.from("genres").upsert(
      [...genres].map(([slug, name]) => ({ slug, name })),
      { onConflict: "slug", ignoreDuplicates: true },
    );
    if (error) throw error;
  }

  // replace the links rather than accumulating duplicates
  for (const table of ["game_platforms", "game_systems", "game_genres"]) {
    const { error } = await db.from(table).delete().in("game_id", gameIds);
    if (error) throw error;
  }

  const links: [string, string, Record<string, unknown>[]][] = [
    [
      "game_platforms",
      "game_id,platform_slug",
      games.flatMap(({ id, game }) =>
        game.platformSlugs.map((slug) => ({
          game_id: id,
          platform_slug: slug,
        })),
      ),
    ],
    [
      "game_systems",
      "game_id,system_slug",
      games.flatMap(({ id, game }) =>
        game.systemSlugs.map((slug) => ({ game_id: id, system_slug: slug })),
      ),
    ],
    [
      "game_genres",
      "game_id,genre_slug",
      games.flatMap(({ id, game }) =>
        game.genres.map((genre) => ({ game_id: id, genre_slug: genre.slug })),
      ),
    ],
  ];
  /* Two searches can replace the same game's links at once, and the later
     insert would find the earlier one's rows already there. */
  for (const [table, onConflict, rows] of links) {
    if (rows.length === 0) continue;
    const { error } = await db
      .from(table)
      .upsert(rows, { onConflict, ignoreDuplicates: true });
    if (error) throw error;
  }
};

export const createGamesRepository = (db: Db): GamesRepository => {
  /* The library with no filter is most of its visits, and counting a
     hundred thousand games each time was most of each one's cost. The
     total moves by a few games a day, so it's counted every ten minutes. */
  const countAll = (showSexualContent: boolean) => async () => {
    let builder = db.from("games").select("id", { count: "exact", head: true });
    if (!showSexualContent) builder = builder.eq("has_sexual_content", false);
    const { count, error } = await builder;
    if (error) throw error;
    return count ?? 0;
  };
  // "Newest" with nothing else chosen counts every released game the same way.
  const countReleased = (showSexualContent: boolean) => async () => {
    let builder = db
      .from("games")
      .select("id", { count: "exact", head: true })
      .lte("release_date", today());
    if (!showSexualContent) builder = builder.eq("has_sexual_content", false);
    const { count, error } = await builder;
    if (error) throw error;
    return count ?? 0;
  };
  const totals = {
    familySafe: memoFor(10 * 60_000, countAll(false)),
    everything: memoFor(10 * 60_000, countAll(true)),
    releasedFamilySafe: memoFor(10 * 60_000, countReleased(false)),
    releasedEverything: memoFor(10 * 60_000, countReleased(true)),
  };
  /* A genre or platform with nothing else chosen, kept the same way. Counted
     through the link tables, which reads indexes alone: through the slug
     copies it read every match's row, eight seconds for Mac. */
  const linkedTotals = new Map<string, () => Promise<number>>();
  const linkedTotal = (args: {
    p_genre: string | null;
    p_platform: string | null;
    p_include_sexual: boolean;
    p_released_until?: string;
    p_released_after?: string;
  }): Promise<number> => {
    const key = JSON.stringify(args);
    let total = linkedTotals.get(key);
    if (!total) {
      total = memoFor(10 * 60_000, async () => {
        const { data, error } = await db.rpc("count_linked_games", args);
        if (error) throw error;
        return Number(data ?? 0);
      });
      linkedTotals.set(key, total);
    }
    return total();
  };

  const readByIds = async (ids: number[]): Promise<GameRowWithPlatforms[]> => {
    if (ids.length === 0) return [];
    const { data, error } = await db
      .from("games")
      .select(SELECT_WITH_RELATIONS)
      .in("id", ids);
    if (error) throw error;
    return (data ?? []) as GameRowWithPlatforms[];
  };

  return {
    async findById(id) {
      const { data, error } = await db
        .from("games")
        .select(SELECT_WITH_RELATIONS)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data as GameRowWithPlatforms | null) ?? null;
    },

    findByIds: readByIds,

    async findByIgdbId(igdbId) {
      const { data, error } = await db
        .from("games")
        .select(SELECT_WITH_RELATIONS)
        .eq("igdb_id", igdbId)
        .maybeSingle();
      if (error) throw error;
      return (data as GameRowWithPlatforms | null) ?? null;
    },

    async list(query, from, to, excludeLoggedForUser, showSexualContent) {
      const run = async (closeIds?: number[]) => {
        /* Paged on ids alone, then read in full: PostgREST builds the links of
         every row it skips past, so page 400 built nearly ten thousand to
         show twenty-four. */
        const select = ["id"];
        if (excludeLoggedForUser) select.push("own_logs:game_logs()");

        const nothingElse =
          !closeIds &&
          !query.search &&
          query.trending === undefined &&
          !excludeLoggedForUser &&
          !query.releasedAfter &&
          !query.releasedBefore;
        const linked = !!query.genre || !!query.platform;
        const plain = nothingElse && !linked;
        const unfiltered =
          plain && query.sort !== "released" && query.sort !== "upcoming";
        const justReleased = plain && query.sort === "released";
        const justLinked = nothingElse && linked;
        const counted =
          query.count !== false && !unfiltered && !justReleased && !justLinked;

        let builder = db
          .from("games")
          .select(select.join(", "), counted ? { count: "exact" } : undefined);

        if (closeIds) builder = builder.in("id", closeIds);
        else if (query.search) builder = matchTitle(builder, query.search);
        if (query.trending !== undefined) {
          builder = builder.eq("is_trending", query.trending);
        }
        if (!showSexualContent) {
          builder = builder.eq("has_sexual_content", false);
        }

        /* The game's own copies of its links, which an index serves. An
         inner join on the link tables ran a subquery per game, and a rare
         pair walked the whole catalogue past the timeout. */
        if (query.genre) {
          builder = builder.contains("genre_slugs", [query.genre]);
        }
        if (query.platform) {
          builder = builder.contains("platform_slugs", [query.platform]);
        }

        /* "Hide games I have already logged", as an anti-join: games with no
         log of theirs. Reading their logged ids first and passing them back
         stopped at 1000, and past a few hundred made a URL too long. */
        if (excludeLoggedForUser) {
          builder = builder
            .eq("own_logs.user_id", excludeLoggedForUser)
            .is("own_logs", null);
        }

        if (query.releasedAfter) {
          builder = builder.gte("release_date", query.releasedAfter);
        }
        if (query.releasedBefore) {
          builder = builder.lte("release_date", query.releasedBefore);
        }

        /* "Newest" means newest *released*: an announced game's date is a plan,
         not a release, and those would take the whole front of this sort. A
         caller's own releasedBefore still narrows it further, since both
         bounds apply. */
        if (query.sort === "released") {
          builder = builder.lte("release_date", today());
        }

        /* Log count is the default: this site's own figures should order it.
         IGDB's rating count sits underneath as a hidden second key, because
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
          case "upcoming":
            builder = builder
              .gt("release_date", today())
              .order("release_date", { ascending: true });
            break;
          case "rating":
            /* Our ratings, not IGDB's. The count is a second key so one lone
             10.0 doesn't outrank a game fifty people settled at 9.2. */
            builder = builder
              .order("avg_rating", desc)
              .order("rating_count", desc);
            break;
          case "critic":
            builder = builder.order("critic_score", desc);
            break;
          default:
            // The trending set comes ranked from IGDB; keep its order.
            if (query.trending === true) {
              builder = builder.order("trending_rank", {
                ascending: true,
                nullsFirst: false,
              });
            }
            builder = builder
              .order("log_count", desc)
              .order("igdb_rating_count", desc);
        }

        /* The tiebreaker is not optional. Every sort key above collides, and
         Postgres gives no stable order among equal rows — so deep paging would
         show some rows twice and skip others. */
        const { data, error, count } = await builder
          .order("id")
          .range(from, to);
        if (error) throw error;
        // the select string is built at runtime, so supabase-js cannot infer it
        const ids = ((data ?? []) as unknown as { id: number }[]).map(
          (row) => row.id,
        );
        const byId = new Map(
          (await readByIds(ids)).map((row) => [row.id, row]),
        );
        const rows = ids.flatMap((id) => byId.get(id) ?? []);
        if (unfiltered && query.count !== false) {
          const total = await (showSexualContent
            ? totals.everything()
            : totals.familySafe());
          return { rows, total };
        }
        if (justReleased && query.count !== false) {
          const total = await (showSexualContent
            ? totals.releasedEverything()
            : totals.releasedFamilySafe());
          return { rows, total };
        }
        if (justLinked && query.count !== false) {
          const total = await linkedTotal({
            p_genre: query.genre ?? null,
            p_platform: query.platform ?? null,
            p_include_sexual: !!showSexualContent,
            ...(query.sort === "released" && { p_released_until: today() }),
            ...(query.sort === "upcoming" && { p_released_after: today() }),
          });
          return { rows, total };
        }
        // Uncounted, the total is only what this page reached.
        return { rows, total: count ?? from + rows.length };
      };

      const result = await run();
      if (!query.search || from > 0 || result.total >= THIN_RESULTS) {
        return result;
      }

      /* Thin, or nothing: what search_games finds instead, which adds the
       titles nearest what was typed, typos and all, so "witchr" brings The
       Witcher and not only Witch Rise. With nothing matched outright it is
       flagged, so the page says so and still looks upstream for a game the
       catalogue may simply not have. */
      const { data: hits, error } = await db.rpc("search_games", {
        p_query: query.search,
        p_limit: 50,
        p_include_sexual: showSexualContent ?? false,
      });
      if (error) throw error;
      const ids = ((hits ?? []) as { id: number }[]).map((h) => h.id);
      if (ids.length <= result.total) return result;
      const wider = await run(ids);
      return result.total === 0 ? { ...wider, approximate: true } : wider;
    },

    async searchLocal(term, limit, showSexualContent) {
      const { data: hits, error } = await db.rpc("search_games", {
        p_query: term,
        p_limit: limit,
        p_include_sexual: showSexualContent,
      });
      if (error) throw error;
      const ranked = (hits ?? []) as { id: number; tier: number }[];
      if (ranked.length === 0) return { rows: [], exact: 0 };

      const { data, error: readError } = await db
        .from("games")
        .select(SELECT_WITH_RELATIONS)
        .in(
          "id",
          ranked.map((h) => h.id),
        );
      if (readError) throw readError;
      const byId = new Map(
        ((data ?? []) as GameRowWithPlatforms[]).map((row) => [row.id, row]),
      );
      return {
        rows: ranked.flatMap((h) => byId.get(h.id) ?? []),
        exact: ranked.filter((h) => h.tier < CLOSE_TIER).length,
      };
    },

    /** Upserts a batch on the IGDB id and replaces their platform, system and
     *  genre links. */
    async setBackdrops(id, backdrops) {
      const { error } = await db
        .from("games")
        .update({ backdrops })
        .eq("id", id);
      if (error) throw error;
    },

    async upsertMany(games) {
      if (games.length === 0) return [];

      const now = new Date().toISOString();
      const { data, error } = await db
        .from("games")
        .upsert(
          // Every row the same shape: a batch where some rows leave the
          // description out sends null for those, and the column refuses it.
          games.map((g) => ({ ...toRow(g, now), description: g.description })),
          { onConflict: "igdb_id", ignoreDuplicates: false },
        )
        .select("id, igdb_id");
      if (error) throw error;

      const saved = (data ?? []) as { id: number; igdb_id: number }[];
      const idByIgdbId = new Map(saved.map((r) => [r.igdb_id, r.id]));
      await replaceLinks(
        db,
        games.flatMap((g) => {
          const id = idByIgdbId.get(g.externalId);
          return id ? [{ id, game: g }] : [];
        }),
      );
      return saved.map((r) => r.id);
    },

    /* Both aggregate in SQL. Reducing in JS means pulling every row, which
     PostgREST truncates at 1000. */
    async statusCounts(gameId) {
      const { data, error } = await db
        .rpc("game_status_counts", { p_game_id: gameId })
        .single();
      if (error) throw error;

      const row = data as Record<string, number>;
      const count = (key: string) => Number(row[key] ?? 0);

      return {
        byStatus: {
          played: count("played"),
          playing: count("playing"),
          backlog: count("backlog"),
          wishlist: count("wishlist"),
        },
        /* Kept apart from byStatus: these are a slice of `played`, and summing
         one record for a total would count those logs twice. */
        byPlayedStatus: {
          finished: count("finished"),
          mastered: count("mastered"),
          shelved: count("shelved"),
          retired: count("retired"),
        },
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

    async applyExternal(id, game) {
      const { error } = await db
        .from("games")
        .update(toRow(game, new Date().toISOString()))
        .eq("id", id);
      if (error) throw error;
      await replaceLinks(db, [{ id, game }]);
    },

    async count() {
      const { count, error } = await db
        .from("games")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },

    async listSeries(seriesId, exceptId, limit, showSexualContent) {
      let builder = db
        .from("games")
        .select(SELECT_WITH_RELATIONS)
        .eq("series_id", seriesId)
        .neq("id", exceptId);
      if (!showSexualContent) builder = builder.eq("has_sexual_content", false);
      const { data, error } = await builder
        .order("igdb_rating_count", { ascending: false, nullsFirst: false })
        .order("release_date", { ascending: false, nullsFirst: false })
        .order("id")
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as GameRowWithPlatforms[];
    },

    async listByDeveloper(developer, exceptIds, limit, showSexualContent) {
      let builder = db
        .from("games")
        .select(SELECT_WITH_RELATIONS)
        .contains("developers", [developer])
        .not("id", "in", `(${exceptIds.join(",")})`);
      if (!showSexualContent) builder = builder.eq("has_sexual_content", false);
      const { data, error } = await builder
        .order("igdb_rating_count", { ascending: false, nullsFirst: false })
        .order("id")
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as GameRowWithPlatforms[];
    },

    async listByIgdbIds(igdbIds, showSexualContent) {
      if (igdbIds.length === 0) return [];
      let builder = db
        .from("games")
        .select(SELECT_WITH_RELATIONS)
        .in("igdb_id", igdbIds);
      if (!showSexualContent) builder = builder.eq("has_sexual_content", false);
      const { data, error } = await builder;
      if (error) throw error;
      const rank = new Map(igdbIds.map((id, i) => [id, i]));
      return ((data ?? []) as GameRowWithPlatforms[]).sort(
        (a, b) => rank.get(a.igdb_id!)! - rank.get(b.igdb_id!)!,
      );
    },

    async existingIgdbIds(igdbIds) {
      if (igdbIds.length === 0) return [];
      const { data, error } = await db
        .from("games")
        .select("igdb_id")
        .in("igdb_id", igdbIds);
      if (error) throw error;
      return (data ?? []).map((row) => row.igdb_id as number);
    },

    async replaceTrending(ids) {
      const { error } = await db.rpc("set_trending", { p_ids: ids });
      if (error) throw error;
    },

    async setTrending(id, isTrending) {
      const { error } = await db
        .from("games")
        .update({ is_trending: isTrending })
        .eq("id", id);
      if (error) throw error;
    },
  };
};
