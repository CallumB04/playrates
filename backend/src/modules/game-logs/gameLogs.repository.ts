import type {
  GameLogSort,
  PlayedStatusFilter,
  SortDirection,
} from "@playrates/shared";
import type { Db } from "../../config/supabase.js";
import type {
  GameLogRow,
  UserLogStatsRow,
} from "../../types/database.types.js";
import { AppError } from "../../lib/AppError.js";
import type { GameLogRowWithGame } from "./gameLogs.mapper.js";

const SELECT_WITH_GAME = "*, game:games(*, game_platforms(platform_slug))";

/** Postgres' unique_violation. */
const UNIQUE_VIOLATION = "23505";

// PostgREST stops at 1000 rows a request; a long-time user can pass that.
const PAGE = 1000;

/** game_logs_user_game_system_unique: this console, or a second log with no
 *  console, is already logged for this game. */
const platformTaken = () =>
  AppError.conflict(
    "platform_taken",
    "You've already logged this game on that platform",
  );

/**
 * The column each sort orders by. Three live on the game rather than the log,
 * and PostgREST spells ordering a row by its embedded to-one as `game(col)`.
 */
const SORT_COLUMNS: Record<GameLogSort, string> = {
  rating: "rating",
  gameRating: "game(avg_rating)",
  critic: "game(critic_score)",
  /* When it was played, not when the row was last written — editing an old
     log should not move it to the top of the shelf. */
  played: "last_played",
  title: "game(title)",
  released: "game(release_date)",
  completion: "completion",
  hoursPlayed: "hours_played",
  hoursToBeat: "hours_to_beat",
};

/** The same orderings over game_log_rollups, a row per game: the mean
 *  rating, the latest play, the best completion, the total hours and the
 *  quickest beat. */
const ROLLUP_SORT_COLUMNS: Record<GameLogSort, string> = {
  rating: "rating",
  gameRating: "game_avg_rating",
  critic: "game_critic_score",
  played: "last_played",
  title: "game_title",
  released: "game_release_date",
  completion: "completion",
  hoursPlayed: "hours_played",
  hoursToBeat: "hours_to_beat",
};

/** What a shelf is filtered and ordered by. Bundled rather than threaded
 *  through three layers as loose arguments. */
export interface ShelfQuery {
  status?: string;
  /** Only meaningful on the played shelf, where substatuses live. */
  playedStatus?: PlayedStatusFilter;
  sort: GameLogSort;
  direction: SortDirection;
}

export interface GameLogsRepository {
  /** One row per log. Kept for clients from before logs were per console. */
  listByUser(
    userId: string,
    query: ShelfQuery,
    from: number,
    to: number,
  ): Promise<{ rows: GameLogRowWithGame[]; total: number }>;
  /** A page of games: a game sits on every shelf one of its logs is on. */
  shelfByUser(
    userId: string,
    query: ShelfQuery,
    from: number,
    to: number,
  ): Promise<{ gameIds: number[]; total: number }>;
  /** The user's log, or null if it is not theirs. */
  findOwn(userId: string, logId: number): Promise<GameLogRowWithGame | null>;
  /** Oldest first, so the consoles keep the order they were logged in. */
  listByUserAndGame(
    userId: string,
    gameId: number,
  ): Promise<GameLogRowWithGame[]>;
  listByUserAndGames(
    userId: string,
    gameIds: number[],
  ): Promise<GameLogRowWithGame[]>;
  create(
    userId: string,
    gameId: number,
    patch: Partial<GameLogRow>,
  ): Promise<GameLogRowWithGame>;
  update(id: number, patch: Partial<GameLogRow>): Promise<GameLogRowWithGame>;
  remove(id: number): Promise<void>;
  count(): Promise<number>;
  /** Every log a user holds, without the embedded game. */
  summariesByUser(userId: string): Promise<GameLogSummaryRow[]>;
  /** Totals across a user's whole shelf, optionally within one year. */
  statsByUser(userId: string, year?: number): Promise<UserLogStats>;
}

export interface GameLogSummaryRow {
  id: number;
  game_id: number;
  system_slug: string | null;
  status: string;
  played_status: string | null;
  rating: number | null;
}

export interface UserLogStats {
  logCount: number;
  gameCount: number;
  /** Games with a log in each status. */
  byStatus: Record<string, number>;
  hoursPlayed: number;
  averageRating: number | null;
  ratingCount: number;
}

export const createGameLogsRepository = (db: Db): GameLogsRepository => ({
  async listByUser(userId, query, from, to) {
    let builder = db
      .from("game_logs")
      .select(SELECT_WITH_GAME, { count: "exact" })
      .eq("user_id", userId);

    if (query.status) builder = builder.eq("status", query.status);

    if (query.playedStatus === "none") {
      builder = builder.is("played_status", null);
    } else if (query.playedStatus) {
      builder = builder.eq("played_status", query.playedStatus);
    }

    const { data, error, count } = await builder
      .order(SORT_COLUMNS[query.sort], {
        ascending: query.direction === "asc",
        /* A log with nothing to sort on goes last either way. Reversing the
           direction should not float the blanks to the top. */
        nullsFirst: false,
      })
      // Ties are common — unrated shelves sort entirely on the tiebreaker.
      .order("id", { ascending: false })
      .range(from, to);
    if (error) throw error;
    return { rows: (data ?? []) as GameLogRowWithGame[], total: count ?? 0 };
  },

  async shelfByUser(userId, query, from, to) {
    let builder = db
      .from("game_log_rollups")
      .select("game_id", { count: "exact" })
      .eq("user_id", userId);

    if (query.status) builder = builder.contains("statuses", [query.status]);
    if (query.playedStatus) {
      builder = builder.contains("played_endings", [query.playedStatus]);
    }

    const { data, error, count } = await builder
      .order(ROLLUP_SORT_COLUMNS[query.sort], {
        ascending: query.direction === "asc",
        nullsFirst: false,
      })
      .order("latest_log_id", { ascending: false })
      .range(from, to);
    if (error) throw error;
    return {
      gameIds: ((data ?? []) as { game_id: number }[]).map((r) => r.game_id),
      total: count ?? 0,
    };
  },

  async findOwn(userId, logId) {
    const { data, error } = await db
      .from("game_logs")
      .select(SELECT_WITH_GAME)
      .eq("id", logId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return (data as GameLogRowWithGame | null) ?? null;
  },

  async listByUserAndGame(userId, gameId) {
    return this.listByUserAndGames(userId, [gameId]);
  },

  async listByUserAndGames(userId, gameIds) {
    if (gameIds.length === 0) return [];
    const { data, error } = await db
      .from("game_logs")
      .select(SELECT_WITH_GAME)
      .eq("user_id", userId)
      .in("game_id", gameIds)
      .order("created_at")
      .order("id");
    if (error) throw error;
    return (data ?? []) as GameLogRowWithGame[];
  },

  async create(userId, gameId, patch) {
    const { data, error } = await db
      .from("game_logs")
      .insert({ ...patch, user_id: userId, game_id: gameId })
      .select(SELECT_WITH_GAME)
      .single();
    if (error?.code === UNIQUE_VIOLATION) throw platformTaken();
    if (error) throw error;
    return data as GameLogRowWithGame;
  },

  async update(id, patch) {
    const { data, error } = await db
      .from("game_logs")
      .update(patch)
      .eq("id", id)
      .select(SELECT_WITH_GAME)
      .single();
    if (error?.code === UNIQUE_VIOLATION) throw platformTaken();
    if (error) throw error;
    return data as GameLogRowWithGame;
  },

  async remove(id) {
    const { error } = await db.from("game_logs").delete().eq("id", id);
    if (error) throw error;
  },

  async count() {
    const { count, error } = await db
      .from("game_logs")
      .select("id", { count: "exact", head: true });
    if (error) throw error;
    return count ?? 0;
  },

  /* Narrow columns rather than the paginated list. Callers only ask "have I
     logged this, and how", which a page can't answer. Paged past PostgREST's
     row cap, as a long-time user can hold more logs than one request returns. */
  async summariesByUser(userId) {
    const rows: GameLogSummaryRow[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await db
        .from("game_logs")
        .select("id, game_id, system_slug, status, played_status, rating")
        .eq("user_id", userId)
        .order("id")
        .range(from, from + PAGE - 1);
      if (error) throw error;
      rows.push(...((data ?? []) as GameLogSummaryRow[]));
      if ((data ?? []).length < PAGE) return rows;
    }
  },

  async statsByUser(userId, year) {
    const { data, error } = await db
      .rpc("user_log_stats", { p_user_id: userId, p_year: year ?? null })
      .single();
    if (error) throw error;
    const row = data as UserLogStatsRow;
    const rating =
      row.average_rating === null ? null : Number(row.average_rating);

    return {
      logCount: row.log_count,
      gameCount: row.game_count,
      byStatus: {
        played: row.played,
        playing: row.playing,
        backlog: row.backlog,
        wishlist: row.wishlist,
      },
      hoursPlayed: Math.round(Number(row.hours_played ?? 0) * 10) / 10,
      averageRating: rating === null ? null : Math.round(rating * 100) / 100,
      ratingCount: row.rated_games,
    };
  },
});
