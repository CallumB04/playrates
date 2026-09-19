import type { Db } from "../../config/supabase.js";
import type { GameLogRow } from "../../types/database.types.js";
import type { GameLogRowWithGame } from "./gameLogs.mapper.js";

const SELECT_WITH_GAME = "*, game:games(*, game_platforms(platform_slug))";

export interface GameLogsRepository {
  listByUser(
    userId: string,
    status: string | undefined,
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
}

export const createGameLogsRepository = (db: Db): GameLogsRepository => ({
  async listByUser(userId, status, from, to) {
    let builder = db
      .from("game_logs")
      .select(SELECT_WITH_GAME, { count: "exact" })
      .eq("user_id", userId);

    if (status) builder = builder.eq("status", status);

    const { data, error, count } = await builder
      .order("updated_at", { ascending: false })
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
});
