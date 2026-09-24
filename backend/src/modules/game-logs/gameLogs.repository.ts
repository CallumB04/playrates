import type { GameLogSort, SortDirection } from "@playrates/shared";
import type { Db } from "../../config/supabase.js";
import type { GameLogRow } from "../../types/database.types.js";
import type { GameLogRowWithGame } from "./gameLogs.mapper.js";

const SELECT_WITH_GAME = "*, game:games(*, game_platforms(platform_slug))";

/**
 * The column each sort orders by. Three live on the game rather than the log,
 * and PostgREST spells ordering a row by its embedded to-one as `game(col)`.
 */
const SORT_COLUMNS: Record<GameLogSort, string> = {
  rating: "rating",
  gameRating: "game(avg_rating)",
  metacritic: "game(metacritic)",
  /* When it was played, not when the row was last written — editing an old
     log should not move it to the top of the shelf. */
  played: "last_played",
  title: "game(title)",
  released: "game(release_date)",
  completion: "completion",
};

/** What a shelf is filtered and ordered by. Bundled rather than threaded
 *  through three layers as loose arguments. */
export interface ShelfQuery {
  status?: string;
  sort: GameLogSort;
  direction: SortDirection;
}

export interface GameLogsRepository {
  listByUser(
    userId: string,
    query: ShelfQuery,
    from: number,
    to: number,
  ): Promise<{ rows: GameLogRowWithGame[]; total: number }>;
  findByUserAndGame(
    userId: string,
    gameId: number,
  ): Promise<GameLogRowWithGame | null>;
  upsert(
    userId: string,
    gameId: number,
    patch: Partial<GameLogRow>,
  ): Promise<{ row: GameLogRowWithGame; created: boolean }>;
  update(id: number, patch: Partial<GameLogRow>): Promise<GameLogRowWithGame>;
  remove(id: number): Promise<void>;
  count(): Promise<number>;
  /** Every log a user holds, without the embedded game. */
  summariesByUser(userId: string): Promise<GameLogSummaryRow[]>;
  /** Totals across a user's whole shelf, optionally within one year. */
  statsByUser(userId: string, year?: number): Promise<UserLogStats>;
}

export interface GameLogSummaryRow {
  game_id: number;
  status: string;
  played_status: string | null;
  rating: number | null;
}

export interface UserLogStats {
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

  async findByUserAndGame(userId, gameId) {
    const { data, error } = await db
      .from("game_logs")
      .select(SELECT_WITH_GAME)
      .eq("user_id", userId)
      .eq("game_id", gameId)
      .maybeSingle();
    if (error) throw error;
    return (data as GameLogRowWithGame | null) ?? null;
  },

  async upsert(userId, gameId, patch) {
    const existing = await this.findByUserAndGame(userId, gameId);

    if (existing) {
      const row = await this.update(existing.id, patch);
      return { row, created: false };
    }

    const { data, error } = await db
      .from("game_logs")
      .insert({ ...patch, user_id: userId, game_id: gameId })
      .select(SELECT_WITH_GAME)
      .single();
    if (error) throw error;
    return { row: data as GameLogRowWithGame, created: true };
  },

  async update(id, patch) {
    const { data, error } = await db
      .from("game_logs")
      .update(patch)
      .eq("id", id)
      .select(SELECT_WITH_GAME)
      .single();
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

  /* Four narrow columns rather than the paginated list. Callers only ask "have
     I logged this, and how", which a page can't answer. Small enough to send
     whole even at several thousand logs. */
  async summariesByUser(userId) {
    const { data, error } = await db
      .from("game_logs")
      .select("game_id, status, played_status, rating")
      .eq("user_id", userId);
    if (error) throw error;
    return (data ?? []) as GameLogSummaryRow[];
  },

  async statsByUser(userId, year) {
    let builder = db
      .from("game_logs")
      .select("status, hours_played, rating")
      .eq("user_id", userId);

    if (year !== undefined) {
      builder = builder
        .gte("updated_at", `${year}-01-01`)
        .lt("updated_at", `${year + 1}-01-01`);
    }

    const { data, error } = await builder;
    if (error) throw error;

    const rows = (data ?? []) as {
      status: string;
      hours_played: number | null;
      rating: number | null;
    }[];

    const byStatus: Record<string, number> = {
      played: 0,
      playing: 0,
      backlog: 0,
      wishlist: 0,
    };
    let hoursPlayed = 0;
    let ratingSum = 0;
    let ratingCount = 0;

    for (const row of rows) {
      byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
      if (row.hours_played !== null) hoursPlayed += Number(row.hours_played);
      if (row.rating !== null) {
        ratingSum += Number(row.rating);
        ratingCount += 1;
      }
    }

    return {
      byStatus,
      hoursPlayed: Math.round(hoursPlayed * 10) / 10,
      averageRating:
        ratingCount === 0
          ? null
          : Math.round((ratingSum / ratingCount) * 100) / 100,
      ratingCount,
    };
  },
});
