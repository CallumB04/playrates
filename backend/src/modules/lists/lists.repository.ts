import type { ListSort, ProfileVisibility } from "@playrates/shared";
import type { Db } from "../../config/supabase.js";

/** A list as game_list_cards has it: its own columns, its counts, its
 *  first four games and its owner. */
export interface ListCardRow {
  id: number;
  user_id: string;
  name: string;
  description: string;
  visibility: string;
  colour: string | null;
  ranked: boolean;
  cover_game_ids: number[] | null;
  created_at: string;
  updated_at: string;
  game_count: number;
  vote_count: number;
  first_game_ids: number[];
  owner_username: string;
  owner_avatar_url: string | null;
  owner_accent: string;
  owner_visibility: string;
}

export interface ListItemRow {
  game_id: number;
  position: number;
  added_at: string;
}

export interface ListFields {
  name: string;
  description: string;
  visibility: ProfileVisibility;
  colour: string | null;
  ranked: boolean;
  cover_game_ids: number[] | null;
}

export interface CardPage {
  rows: ListCardRow[];
  total: number;
}

interface PageQuery {
  sort: ListSort;
  page: number;
  limit: number;
}

export interface ListsRepository {
  card(id: number): Promise<ListCardRow | null>;
  /** Someone's lists, only at the visibilities given. */
  cardsByUser(
    userId: string,
    visibilities: ProfileVisibility[],
    query: PageQuery,
  ): Promise<CardPage>;
  /** Lists anyone may see: public, on a public profile. `ids` narrows them. */
  publicCards(query: PageQuery, ids?: number[]): Promise<CardPage>;
  /** The lists a game is in. */
  listIdsWithGame(gameId: number, among?: number[]): Promise<number[]>;
  countByUser(userId: string): Promise<number>;
  create(userId: string, fields: ListFields): Promise<number>;
  update(id: number, patch: Partial<ListFields>): Promise<void>;
  remove(id: number): Promise<void>;
  /** Marks it changed when only its games did, for sorting by recent. */
  touch(id: number): Promise<void>;
  items(listId: number): Promise<ListItemRow[]>;
  /** Its games and their order, in one statement. */
  setGames(listId: number, gameIds: number[]): Promise<void>;
  /** At the end, unless it's in already. */
  addGame(listId: number, gameId: number): Promise<void>;
  removeGame(listId: number, gameId: number): Promise<void>;
  votedListIds(userId: string, listIds: number[]): Promise<Set<number>>;
  hasVoted(userId: string, listId: number): Promise<boolean>;
  addVote(userId: string, listId: number): Promise<void>;
  removeVote(userId: string, listId: number): Promise<void>;
  voteCount(listId: number): Promise<number>;
}

const ORDER: Record<ListSort, { column: string; ascending: boolean }[]> = {
  top: [
    { column: "vote_count", ascending: false },
    { column: "updated_at", ascending: false },
  ],
  recent: [{ column: "updated_at", ascending: false }],
};

export const createListsRepository = (db: Db): ListsRepository => {
  const paged = async (
    where: {
      userId?: string;
      visibilities?: ProfileVisibility[];
      /** Public lists on public profiles only. */
      open?: boolean;
      ids?: number[];
    },
    { sort, page, limit }: PageQuery,
  ): Promise<CardPage> => {
    let q = db.from("game_list_cards").select("*", { count: "exact" });
    if (where.userId) q = q.eq("user_id", where.userId);
    if (where.visibilities) q = q.in("visibility", where.visibilities);
    if (where.open) {
      q = q.eq("visibility", "everyone").eq("owner_visibility", "everyone");
    }
    if (where.ids) q = q.in("id", where.ids);
    for (const { column, ascending } of ORDER[sort]) {
      q = q.order(column, { ascending });
    }
    const from = (page - 1) * limit;
    const { data, error, count } = await q
      .order("id", { ascending: false })
      .range(from, from + limit - 1);
    if (error) throw error;
    return { rows: (data ?? []) as ListCardRow[], total: count ?? 0 };
  };

  return {
    async card(id) {
      const { data, error } = await db
        .from("game_list_cards")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data as ListCardRow | null) ?? null;
    },

    cardsByUser(userId, visibilities, query) {
      return paged({ userId, visibilities }, query);
    },

    publicCards(query, ids) {
      return paged({ open: true, ids }, query);
    },

    async listIdsWithGame(gameId, among) {
      let q = db
        .from("game_list_items")
        .select("list_id")
        .eq("game_id", gameId);
      if (among) q = q.in("list_id", among);
      const { data, error } = await q;
      if (error) throw error;
      return ((data ?? []) as { list_id: number }[]).map((r) => r.list_id);
    },

    async countByUser(userId) {
      const { count, error } = await db
        .from("game_lists")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      if (error) throw error;
      return count ?? 0;
    },

    async create(userId, fields) {
      const { data, error } = await db
        .from("game_lists")
        .insert({ user_id: userId, ...fields })
        .select("id")
        .single();
      if (error) throw error;
      return (data as { id: number }).id;
    },

    async update(id, patch) {
      const { error } = await db.from("game_lists").update(patch).eq("id", id);
      if (error) throw error;
    },

    async remove(id) {
      const { error } = await db.from("game_lists").delete().eq("id", id);
      if (error) throw error;
    },

    async touch(id) {
      const { error } = await db
        .from("game_lists")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },

    async items(listId) {
      const { data, error } = await db
        .from("game_list_items")
        .select("game_id, position, added_at")
        .eq("list_id", listId)
        .order("position");
      if (error) throw error;
      return (data ?? []) as ListItemRow[];
    },

    async setGames(listId, gameIds) {
      const { error } = await db.rpc("set_game_list_items", {
        p_list_id: listId,
        p_game_ids: gameIds,
      });
      if (error) throw error;
    },

    async addGame(listId, gameId) {
      const { data, error } = await db
        .from("game_list_items")
        .select("position")
        .eq("list_id", listId)
        .order("position", { ascending: false })
        .limit(1);
      if (error) throw error;
      const last = (data as { position: number }[] | null)?.[0]?.position;
      const { error: insertError } = await db
        .from("game_list_items")
        .upsert(
          { list_id: listId, game_id: gameId, position: (last ?? -1) + 1 },
          { onConflict: "list_id,game_id", ignoreDuplicates: true },
        );
      if (insertError) throw insertError;
    },

    async removeGame(listId, gameId) {
      const { error } = await db
        .from("game_list_items")
        .delete()
        .eq("list_id", listId)
        .eq("game_id", gameId);
      if (error) throw error;
    },

    async votedListIds(userId, listIds) {
      if (listIds.length === 0) return new Set();
      const { data, error } = await db
        .from("game_list_votes")
        .select("list_id")
        .eq("user_id", userId)
        .in("list_id", listIds);
      if (error) throw error;
      return new Set(
        ((data ?? []) as { list_id: number }[]).map((r) => r.list_id),
      );
    },

    async hasVoted(userId, listId) {
      const { count, error } = await db
        .from("game_list_votes")
        .select("list_id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("list_id", listId);
      if (error) throw error;
      return (count ?? 0) > 0;
    },

    async addVote(userId, listId) {
      const { error } = await db
        .from("game_list_votes")
        .upsert(
          { list_id: listId, user_id: userId },
          { onConflict: "list_id,user_id", ignoreDuplicates: true },
        );
      if (error) throw error;
    },

    async removeVote(userId, listId) {
      const { error } = await db
        .from("game_list_votes")
        .delete()
        .eq("user_id", userId)
        .eq("list_id", listId);
      if (error) throw error;
    },

    async voteCount(listId) {
      const { count, error } = await db
        .from("game_list_votes")
        .select("list_id", { count: "exact", head: true })
        .eq("list_id", listId);
      if (error) throw error;
      return count ?? 0;
    },
  };
};
