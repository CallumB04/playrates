import { FALLBACK_ACCENT } from "@playrates/shared";
import type {
  ListCardRow,
  ListFields,
  ListsRepository,
} from "../../src/modules/lists/lists.repository.js";
import type { InMemoryState } from "./inMemoryRepos.js";

export interface ListRow extends ListFields {
  id: number;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface ListItem {
  list_id: number;
  game_id: number;
  position: number;
  added_at: string;
}

/**
 * The lists repository over plain arrays. The view's arithmetic — the
 * counts, the first four games, the owner's columns — and the rewrite the
 * RPC does are reimplemented, so the service is tested against what the
 * SQL keeps.
 */
export const createInMemoryLists = (state: InMemoryState): ListsRepository => {
  let nextId = 5000;
  // Each change a tick later, so "recent" has an order to keep.
  let clock = Date.parse("2026-02-01T00:00:00.000Z");
  const tick = () => new Date((clock += 1000)).toISOString();

  const itemsOf = (listId: number) =>
    state.gameListItems
      .filter((i) => i.list_id === listId)
      .sort((a, b) => a.position - b.position);

  const cardOf = (list: ListRow): ListCardRow | null => {
    const owner = state.profiles.find((p) => p.id === list.user_id);
    if (!owner) return null;
    const items = itemsOf(list.id);
    return {
      ...list,
      game_count: items.length,
      vote_count: state.gameListVotes.filter((v) => v.list_id === list.id)
        .length,
      first_game_ids: items.slice(0, 4).map((i) => i.game_id),
      owner_username: owner.username,
      owner_avatar_url: owner.avatar_url,
      owner_accent: owner.accent ?? FALLBACK_ACCENT,
      owner_visibility: owner.profile_visibility,
    };
  };

  const pageOf = (
    rows: ListCardRow[],
    { sort, page, limit }: { sort: string; page: number; limit: number },
  ) => {
    const sorted = [...rows].sort(
      (a, b) =>
        (sort === "popular" ? b.vote_count - a.vote_count : 0) ||
        b.created_at.localeCompare(a.created_at) ||
        b.id - a.id,
    );
    const from = (page - 1) * limit;
    return { rows: sorted.slice(from, from + limit), total: sorted.length };
  };

  const cards = () =>
    state.gameLists.flatMap((l) => {
      const card = cardOf(l);
      return card ? [card] : [];
    });

  const touch = (id: number) => {
    const list = state.gameLists.find((l) => l.id === id);
    if (list) list.updated_at = tick();
  };

  return {
    async card(id) {
      const list = state.gameLists.find((l) => l.id === id);
      return list ? cardOf(list) : null;
    },
    async cardsByUser(userId, visibilities, query) {
      return pageOf(
        cards().filter(
          (c) =>
            c.user_id === userId &&
            visibilities.includes(c.visibility as never),
        ),
        query,
      );
    },
    async publicCards(query, ids) {
      return pageOf(
        cards().filter(
          (c) =>
            c.visibility === "everyone" &&
            c.owner_visibility === "everyone" &&
            (!ids || ids.includes(c.id)),
        ),
        query,
      );
    },
    async listIdsWithGame(gameId, among) {
      return state.gameListItems
        .filter(
          (i) => i.game_id === gameId && (!among || among.includes(i.list_id)),
        )
        .map((i) => i.list_id);
    },
    async countByUser(userId) {
      return state.gameLists.filter((l) => l.user_id === userId).length;
    },
    async create(userId, fields) {
      const id = nextId++;
      const at = tick();
      state.gameLists.push({
        id,
        user_id: userId,
        created_at: at,
        updated_at: at,
        ...fields,
      });
      return id;
    },
    async update(id, patch) {
      const list = state.gameLists.find((l) => l.id === id);
      if (list) Object.assign(list, patch, { updated_at: tick() });
    },
    async remove(id) {
      state.gameLists = state.gameLists.filter((l) => l.id !== id);
      state.gameListItems = state.gameListItems.filter((i) => i.list_id !== id);
      state.gameListVotes = state.gameListVotes.filter((v) => v.list_id !== id);
      // the game_lists_clear_notifications trigger
      state.notifications = state.notifications.filter(
        (n) => n.dedupe_key !== `list_upvotes:${id}`,
      );
    },
    async touch(id) {
      touch(id);
    },
    async items(listId) {
      return itemsOf(listId).map(({ game_id, position, added_at }) => ({
        game_id,
        position,
        added_at,
      }));
    },
    async setGames(listId, gameIds) {
      const before = new Map(
        itemsOf(listId).map((i) => [i.game_id, i.added_at]),
      );
      state.gameListItems = [
        ...state.gameListItems.filter((i) => i.list_id !== listId),
        ...gameIds.map((game_id, position) => ({
          list_id: listId,
          game_id,
          position,
          added_at: before.get(game_id) ?? tick(),
        })),
      ];
    },
    async addGame(listId, gameId) {
      const items = itemsOf(listId);
      if (items.some((i) => i.game_id === gameId)) return;
      state.gameListItems.push({
        list_id: listId,
        game_id: gameId,
        position: (items.at(-1)?.position ?? -1) + 1,
        added_at: tick(),
      });
    },
    async removeGame(listId, gameId) {
      state.gameListItems = state.gameListItems.filter(
        (i) => !(i.list_id === listId && i.game_id === gameId),
      );
    },
    async votedListIds(userId, listIds) {
      return new Set(
        state.gameListVotes
          .filter((v) => v.user_id === userId && listIds.includes(v.list_id))
          .map((v) => v.list_id),
      );
    },
    async hasVoted(userId, listId) {
      return state.gameListVotes.some(
        (v) => v.user_id === userId && v.list_id === listId,
      );
    },
    async addVote(userId, listId) {
      if (
        !state.gameListVotes.some(
          (v) => v.user_id === userId && v.list_id === listId,
        )
      ) {
        state.gameListVotes.push({ list_id: listId, user_id: userId });
      }
    },
    async removeVote(userId, listId) {
      state.gameListVotes = state.gameListVotes.filter(
        (v) => !(v.user_id === userId && v.list_id === listId),
      );
    },
    async voteCount(listId) {
      return state.gameListVotes.filter((v) => v.list_id === listId).length;
    },
  };
};
