import {
  canSeeProfile,
  isUpvoteMilestone,
  MAX_LIST_GAMES,
  MAX_LISTS,
  type CreateListInput,
  type GameListDetail,
  type GameListSummary,
  type ListCover,
  type ListSort,
  type MyListOption,
  type Paginated,
  type ProfileVisibility,
  type UpdateListInput,
  type VoteResult,
} from "@playrates/shared";
import { AppError } from "../../lib/AppError.js";
import type { FriendsRepository } from "../friends/friends.repository.js";
import type { GamesRepository } from "../games/games.repository.js";
import { toGame, type GameRowWithPlatforms } from "../games/games.mapper.js";
import type { NotificationsRepository } from "../notifications/notifications.repository.js";
import { listUpvotesKey } from "../notifications/notifications.mapper.js";
import type { ProfileGate } from "../profiles/profileGate.js";
import { cardCoverIds, toListSummary } from "./lists.mapper.js";
import {
  react,
  reactionStates,
  type ReactionsFor,
} from "../../lib/reactions.js";
import type {
  CardPage,
  ListCardRow,
  ListFields,
  ListsRepository,
} from "./lists.repository.js";

interface PageQuery {
  sort: ListSort;
  page: number;
  limit: number;
}

const ALL: ProfileVisibility[] = ["everyone", "friends", "private"];

/** What a viewer may see of someone's lists. */
const visibilitiesFor = (
  isOwner: boolean,
  isFriend: boolean,
): ProfileVisibility[] =>
  ALL.filter((v) => canSeeProfile(v, { isOwner, isFriend }));

/** The rows in the order of the ids, the ones that have gone left out. */
const inOrder = (
  rows: GameRowWithPlatforms[],
  ids: number[],
): GameRowWithPlatforms[] => {
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.flatMap((id) => byId.get(id) ?? []);
};

export const createListsService = (
  repo: ListsRepository,
  games: GamesRepository,
  friends: FriendsRepository,
  notifications: NotificationsRepository,
  gate: ProfileGate,
  reactionsFor: ReactionsFor,
) => {
  const isFriend = async (ownerId: string, viewerId?: string) =>
    !!viewerId &&
    viewerId !== ownerId &&
    (await friends.find(ownerId, viewerId))?.status === "accepted";

  /** Cards with their covers and the viewer's votes, in two lookups for
   *  however many there are. */
  const summaries = async (
    rows: ListCardRow[],
    viewerId?: string,
  ): Promise<GameListSummary[]> => {
    const coverIds = new Map(rows.map((row) => [row.id, cardCoverIds(row)]));
    const wanted = [...new Set([...coverIds.values()].flat())];
    const covers = new Map<number, ListCover>(
      (await games.findByIds(wanted))
        .filter((game) => !game.has_sexual_content)
        // Through toGame, which picks the box art over the wider cover_url.
        .map((row) => {
          const game = toGame(row);
          return [
            game.id,
            { id: game.id, title: game.title, coverUrl: game.coverUrl },
          ];
        }),
    );
    const stateOf = await reactionStates(
      repo.reactions,
      viewerId,
      rows.map((row) => row.id),
    );
    return rows.map((row) =>
      toListSummary(
        row,
        coverIds.get(row.id)!,
        covers,
        stateOf(row.id, row.vote_count),
      ),
    );
  };

  const page = async (
    { rows, total }: CardPage,
    query: PageQuery,
    viewerId?: string,
  ): Promise<Paginated<GameListSummary>> => ({
    data: await summaries(rows, viewerId),
    meta: { page: query.page, limit: query.limit, total },
  });

  /**
   * A list this viewer may open. Past its owner's profile and its own
   * setting both; one they may not see is not found rather than private,
   * so its existence says nothing.
   */
  const visibleCard = async (
    listId: number,
    viewerId?: string,
  ): Promise<ListCardRow> => {
    const card = await repo.card(listId);
    if (!card) throw AppError.notFound("List");
    const isOwner = card.user_id === viewerId;
    if (!isOwner) {
      try {
        await gate(card.owner_username, viewerId);
      } catch {
        throw AppError.notFound("List");
      }
      const friend =
        card.visibility === "friends" &&
        (await isFriend(card.user_id, viewerId));
      if (
        !canSeeProfile(card.visibility as ProfileVisibility, {
          isOwner,
          isFriend: friend,
        })
      ) {
        throw AppError.notFound("List");
      }
    }
    return card;
  };

  const ownCard = async (userId: string, listId: number) => {
    const card = await repo.card(listId);
    if (!card || card.user_id !== userId) throw AppError.notFound("List");
    return card;
  };

  /** Games that may go in a list: all real, none adult. Adult games stay
   *  out because a list is shown to people who've chosen not to see them. */
  const checkGames = async (ids: number[]) => {
    if (ids.length === 0) return [];
    const rows = inOrder(await games.findByIds(ids), ids);
    if (rows.length !== ids.length) throw AppError.notFound("Game");
    if (rows.some((row) => row.has_sexual_content)) {
      throw AppError.validation("An adult game can't go in a list");
    }
    return rows;
  };

  const detail = async (
    card: ListCardRow,
    viewerId?: string,
  ): Promise<GameListDetail> => {
    const items = await repo.items(card.id);
    const ids = items.map((item) => item.game_id);
    const rows = new Map(
      (await games.findByIds(ids))
        .filter((row) => !row.has_sexual_content)
        .map((row) => [row.id, row]),
    );
    const [summary] = await summaries([card], viewerId);
    return {
      ...summary!,
      coverGameIds: card.cover_game_ids,
      games: items
        .flatMap((item) => {
          const row = rows.get(item.game_id);
          return row ? [{ game: toGame(row), addedAt: item.added_at }] : [];
        })
        .map((entry, i) => ({ ...entry, rank: i + 1 })),
    };
  };

  const reload = async (listId: number, viewerId: string) =>
    detail((await repo.card(listId))!, viewerId);

  /** Covers its owner picked that are still in it. */
  const keptCovers = (picked: number[] | null, inList: number[]) => {
    if (!picked) return null;
    const kept = picked.filter((id) => inList.includes(id));
    return kept.length > 0 ? kept : null;
  };

  return {
    /** Someone's lists, as far as this viewer may see them. */
    async listForUsername(
      username: string,
      viewerId: string | undefined,
      query: PageQuery,
    ) {
      const profile = await gate(username, viewerId);
      const isOwner = profile.id === viewerId;
      const friend = !isOwner && (await isFriend(profile.id, viewerId));
      return page(
        await repo.cardsByUser(
          profile.id,
          visibilitiesFor(isOwner, friend),
          query,
        ),
        query,
        viewerId,
      );
    },

    async get(listId: number, viewerId?: string) {
      return detail(await visibleCard(listId, viewerId), viewerId);
    },

    /** Public lists on public profiles, the most upvoted first. */
    async popular(query: Omit<PageQuery, "sort">, viewerId?: string) {
      const full = { ...query, sort: "popular" as const };
      return page(await repo.publicCards(full), full, viewerId);
    },

    /** The public lists a game is in, the most upvoted first. */
    async forGame(gameId: number, limit: number, viewerId?: string) {
      const ids = await repo.listIdsWithGame(gameId);
      if (ids.length === 0) return [];
      const { rows } = await repo.publicCards(
        { sort: "popular", page: 1, limit },
        ids,
      );
      return summaries(rows, viewerId);
    },

    /** Your lists, marked with whether a game is in each, newest made
     *  first: by last change, ticking one sent it to the top. */
    async mine(userId: string, gameId?: number): Promise<MyListOption[]> {
      const { rows } = await repo.cardsByUser(userId, ALL, {
        sort: "new",
        page: 1,
        limit: MAX_LISTS,
      });
      const holding = new Set(
        gameId === undefined
          ? []
          : await repo.listIdsWithGame(
              gameId,
              rows.map((row) => row.id),
            ),
      );
      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        colour: row.colour as MyListOption["colour"],
        visibility: row.visibility as ProfileVisibility,
        gameCount: row.game_count,
        hasGame: holding.has(row.id),
      }));
    },

    async create(userId: string, input: CreateListInput) {
      if ((await repo.countByUser(userId)) >= MAX_LISTS) {
        throw AppError.validation(`You can have up to ${MAX_LISTS} lists`);
      }
      const gameIds = input.gameIds ?? [];
      await checkGames(gameIds);
      const id = await repo.create(userId, {
        name: input.name,
        description: input.description ?? "",
        visibility: input.visibility ?? "everyone",
        colour: input.colour ?? null,
        ranked: input.ranked ?? false,
        cover_game_ids: null,
      });
      if (gameIds.length > 0) await repo.setGames(id, gameIds);
      return reload(id, userId);
    },

    async update(userId: string, listId: number, input: UpdateListInput) {
      await ownCard(userId, listId);
      const patch: Partial<ListFields> = {};
      if (input.name !== undefined) patch.name = input.name;
      if (input.description !== undefined) {
        patch.description = input.description;
      }
      if (input.visibility !== undefined) patch.visibility = input.visibility;
      if (input.colour !== undefined) patch.colour = input.colour;
      if (input.ranked !== undefined) patch.ranked = input.ranked;
      if (input.coverGameIds !== undefined) {
        if (input.coverGameIds) {
          const inList = new Set(
            (await repo.items(listId)).map((item) => item.game_id),
          );
          if (!input.coverGameIds.every((id) => inList.has(id))) {
            throw AppError.validation("A cover has to be a game in the list");
          }
        }
        patch.cover_game_ids =
          input.coverGameIds && input.coverGameIds.length > 0
            ? input.coverGameIds
            : null;
      }
      if (Object.keys(patch).length > 0) await repo.update(listId, patch);
      return reload(listId, userId);
    },

    async remove(userId: string, listId: number) {
      await ownCard(userId, listId);
      await repo.remove(listId);
    },

    /** The whole list in a new order; a game left out leaves it. */
    async setGames(userId: string, listId: number, gameIds: number[]) {
      const card = await ownCard(userId, listId);
      await checkGames(gameIds);
      await repo.setGames(listId, gameIds);
      const covers = keptCovers(card.cover_game_ids, gameIds);
      if (covers !== card.cover_game_ids) {
        await repo.update(listId, { cover_game_ids: covers });
      } else {
        await repo.touch(listId);
      }
      return reload(listId, userId);
    },

    async addGame(userId: string, listId: number, gameId: number) {
      const card = await ownCard(userId, listId);
      if (card.game_count >= MAX_LIST_GAMES) {
        throw AppError.validation(`A list holds up to ${MAX_LIST_GAMES} games`);
      }
      await checkGames([gameId]);
      await repo.addGame(listId, gameId);
      await repo.touch(listId);
    },

    async removeGame(userId: string, listId: number, gameId: number) {
      const card = await ownCard(userId, listId);
      await repo.removeGame(listId, gameId);
      const left = (await repo.items(listId)).map((item) => item.game_id);
      const covers = keptCovers(card.cover_game_ids, left);
      if (covers !== card.cover_game_ids) {
        await repo.update(listId, { cover_game_ids: covers });
      } else {
        await repo.touch(listId);
      }
    },

    /** A reaction: the same one again takes it back, another swaps it. */
    async toggleVote(
      userId: string,
      listId: number,
      reaction?: string,
    ): Promise<VoteResult> {
      const card = await visibleCard(listId, userId);
      if (card.user_id === userId) {
        throw AppError.forbidden("You cannot react to your own list");
      }
      const { state, added } = await react(
        repo.reactions,
        reactionsFor,
        userId,
        listId,
        reaction,
      );
      const voteCount = state.voteCount;
      if (added && isUpvoteMilestone(voteCount)) {
        await notifications.raiseMilestone(
          card.user_id,
          "list_upvote_milestone",
          listUpvotesKey(listId),
          voteCount,
          { listId, listName: card.name, username: card.owner_username },
        );
      }
      return state;
    },
  };
};

export type ListsService = ReturnType<typeof createListsService>;
