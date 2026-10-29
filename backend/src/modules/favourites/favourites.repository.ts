import type { Db } from "../../config/supabase.js";

export interface FavouritesRepository {
  /** Someone's favourite games' ids, in the order they put them. */
  listIds(userId: string): Promise<number[]>;
  /** Replaces them all, in the order given, in one statement. */
  set(userId: string, gameIds: number[]): Promise<void>;
}

export const createFavouritesRepository = (db: Db): FavouritesRepository => ({
  async listIds(userId) {
    const { data, error } = await db
      .from("favourite_games")
      .select("game_id")
      .eq("user_id", userId)
      .order("position");
    if (error) throw error;
    return ((data ?? []) as { game_id: number }[]).map((r) => r.game_id);
  },

  async set(userId, gameIds) {
    const { error } = await db.rpc("set_favourite_games", {
      p_user_id: userId,
      p_game_ids: gameIds,
    });
    if (error) throw error;
  },
});
