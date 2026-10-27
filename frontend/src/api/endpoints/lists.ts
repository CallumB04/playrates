import type {
    CreateListInput,
    GameListDetail,
    GameListSummary,
    ListSort,
    MyListOption,
    Paginated,
    UpdateListInput,
    VoteResult,
} from "@playrates/shared";
import { api } from "../client";

/** Someone's lists, as far as the caller may see them. */
export const fetchUserLists = async (
    username: string,
    params: { sort: ListSort; page: number; limit: number }
): Promise<Paginated<GameListSummary>> => {
    const { data } = await api.get<Paginated<GameListSummary>>(
        `/users/${username}/lists`,
        { params }
    );
    return data;
};

export const fetchList = async (listId: number): Promise<GameListDetail> => {
    const { data } = await api.get<GameListDetail>(`/lists/${listId}`);
    return data;
};

/** Public lists, the most upvoted first. */
export const fetchPopularLists = async (params: {
    page: number;
    limit: number;
}): Promise<Paginated<GameListSummary>> => {
    const { data } = await api.get<Paginated<GameListSummary>>(
        "/lists/popular",
        { params }
    );
    return data;
};

/** The public lists a game is in. */
export const fetchGameLists = async (
    gameId: number,
    limit: number
): Promise<GameListSummary[]> => {
    const { data } = await api.get<GameListSummary[]>(
        `/games/${gameId}/lists`,
        { params: { limit } }
    );
    return data;
};

/** Your lists, marked with whether this game is in each. */
export const fetchMyLists = async (
    gameId?: number
): Promise<MyListOption[]> => {
    const { data } = await api.get<MyListOption[]>("/me/lists", {
        params: gameId === undefined ? {} : { gameId },
    });
    return data;
};

export const createList = async (
    input: CreateListInput
): Promise<GameListDetail> => {
    const { data } = await api.post<GameListDetail>("/me/lists", input);
    return data;
};

export const updateList = async (
    listId: number,
    input: UpdateListInput
): Promise<GameListDetail> => {
    const { data } = await api.patch<GameListDetail>(
        `/me/lists/${listId}`,
        input
    );
    return data;
};

export const deleteList = async (listId: number): Promise<void> => {
    await api.delete(`/me/lists/${listId}`);
};

/** The list's games, all of them, in this order. */
export const setListGames = async (
    listId: number,
    gameIds: number[]
): Promise<GameListDetail> => {
    const { data } = await api.put<GameListDetail>(
        `/me/lists/${listId}/games`,
        { gameIds }
    );
    return data;
};

export const addListGame = async (
    listId: number,
    gameId: number
): Promise<void> => {
    await api.post(`/me/lists/${listId}/games`, { gameId });
};

export const removeListGame = async (
    listId: number,
    gameId: number
): Promise<void> => {
    await api.delete(`/me/lists/${listId}/games/${gameId}`);
};

export const toggleListVote = async (listId: number): Promise<VoteResult> => {
    const { data } = await api.post<VoteResult>(`/lists/${listId}/vote`);
    return data;
};
