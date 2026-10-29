import type { Db } from "../../config/supabase.js";

/** A grid as gaming_25_cards has it: its counts, its centre and its owner. */
export interface Gaming25CardRow {
  user_id: string;
  created_at: string;
  updated_at: string;
  pick_count: number;
  love_count: number;
  centre_game_id: number | null;
  owner_username: string;
  owner_avatar_url: string | null;
  owner_accent: string;
  owner_visibility: string;
}

export interface Gaming25PickRow {
  category: string;
  game_id: number;
}

export interface Gaming25Repository {
  /** Null until its owner's first pick. */
  card(userId: string): Promise<Gaming25CardRow | null>;
  /** Public grids on public profiles with at least `minPicks` filled, the
   *  most loved first. */
  mostLoved(limit: number, minPicks: number): Promise<Gaming25CardRow[]>;
  picks(userId: string): Promise<Gaming25PickRow[]>;
  /** Null clears the cell. Makes the grid with its first pick. */
  setPick(
    userId: string,
    category: string,
    gameId: number | null,
  ): Promise<void>;
  hasLoved(userId: string, ownerId: string): Promise<boolean>;
  addLove(userId: string, ownerId: string): Promise<void>;
  removeLove(userId: string, ownerId: string): Promise<void>;
  loveCount(ownerId: string): Promise<number>;
}

export const createGaming25Repository = (db: Db): Gaming25Repository => ({
  async card(userId) {
    const { data, error } = await db
      .from("gaming_25_cards")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return (data as Gaming25CardRow | null) ?? null;
  },

  async mostLoved(limit, minPicks) {
    const { data, error } = await db
      .from("gaming_25_cards")
      .select("*")
      .eq("owner_visibility", "everyone")
      .gte("pick_count", minPicks)
      .order("love_count", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as Gaming25CardRow[];
  },

  async picks(userId) {
    const { data, error } = await db
      .from("gaming_25_picks")
      .select("category, game_id")
      .eq("user_id", userId);
    if (error) throw error;
    return (data ?? []) as Gaming25PickRow[];
  },

  async setPick(userId, category, gameId) {
    const { error } = await db.rpc("set_gaming_25_pick", {
      p_user_id: userId,
      p_category: category,
      p_game_id: gameId,
    });
    if (error) throw error;
  },

  async hasLoved(userId, ownerId) {
    const { count, error } = await db
      .from("gaming_25_loves")
      .select("owner_id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("owner_id", ownerId);
    if (error) throw error;
    return (count ?? 0) > 0;
  },

  async addLove(userId, ownerId) {
    const { error } = await db
      .from("gaming_25_loves")
      .upsert(
        { owner_id: ownerId, user_id: userId },
        { onConflict: "owner_id,user_id", ignoreDuplicates: true },
      );
    if (error) throw error;
  },

  async removeLove(userId, ownerId) {
    const { error } = await db
      .from("gaming_25_loves")
      .delete()
      .eq("user_id", userId)
      .eq("owner_id", ownerId);
    if (error) throw error;
  },

  async loveCount(ownerId) {
    const { count, error } = await db
      .from("gaming_25_loves")
      .select("owner_id", { count: "exact", head: true })
      .eq("owner_id", ownerId);
    if (error) throw error;
    return count ?? 0;
  },
});
