import {
    keepPreviousData,
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import type {
    CreateListInput,
    GameListDetail,
    ListSort,
    MyListOption,
    UpdateListInput,
} from "@playrates/shared";
import {
    addListGame,
    createList,
    deleteList,
    fetchGameLists,
    fetchList,
    fetchMyLists,
    fetchPopularLists,
    fetchUserLists,
    queryKeys,
    removeListGame,
    setListGames,
    toggleListVote,
    updateList,
} from "../../api";

export const useUserLists = (
    username: string,
    {
        sort,
        page,
        limit,
        enabled = true,
    }: { sort: ListSort; page: number; limit: number; enabled?: boolean }
) =>
    useQuery({
        queryKey: queryKeys.lists.byUsername(username, sort, page, limit),
        queryFn: () => fetchUserLists(username, { sort, page, limit }),
        enabled: enabled && !!username,
        placeholderData: keepPreviousData,
    });

export const useList = (listId: number) =>
    useQuery({
        queryKey: queryKeys.lists.detail(listId),
        queryFn: () => fetchList(listId),
        enabled: Number.isFinite(listId),
    });

export const usePopularLists = (limit: number, page = 1) =>
    useQuery({
        queryKey: queryKeys.lists.popular(page, limit),
        queryFn: () => fetchPopularLists({ page, limit }),
    });

export const useGameLists = (gameId: number, limit: number) =>
    useQuery({
        queryKey: queryKeys.lists.forGame(gameId, limit),
        queryFn: () => fetchGameLists(gameId, limit),
        enabled: Number.isFinite(gameId),
    });

export const useMyLists = (gameId?: number, enabled = true) =>
    useQuery({
        queryKey: queryKeys.lists.mine(gameId),
        queryFn: () => fetchMyLists(gameId),
        enabled,
    });

/** After any change: the answer is the list as it now stands, and every
 *  other view of lists is fetched again. */
const useSettle = () => {
    const client = useQueryClient();
    return (list?: GameListDetail) => {
        if (list) client.setQueryData(queryKeys.lists.detail(list.id), list);
        return client.invalidateQueries({
            queryKey: queryKeys.lists.all,
            predicate: (query) =>
                !list ||
                query.queryKey.join("/") !==
                    queryKeys.lists.detail(list.id).join("/"),
        });
    };
};

export const useCreateList = () => {
    const settle = useSettle();
    return useMutation({
        mutationFn: (input: CreateListInput) => createList(input),
        onSuccess: (list) => settle(list),
    });
};

export const useUpdateList = (listId: number) => {
    const settle = useSettle();
    return useMutation({
        mutationFn: (input: UpdateListInput) => updateList(listId, input),
        onSuccess: (list) => settle(list),
    });
};

export const useDeleteList = () => {
    const client = useQueryClient();
    return useMutation({
        mutationFn: (listId: number) => deleteList(listId),
        onSuccess: (_, listId) => {
            client.removeQueries({ queryKey: queryKeys.lists.detail(listId) });
            return client.invalidateQueries({ queryKey: queryKeys.lists.all });
        },
    });
};

/**
 * A new order, or a game taken out, shown before it saves: the page moves
 * at once and moves back if the save fails.
 */
export const useSetListGames = (listId: number) => {
    const client = useQueryClient();
    const settle = useSettle();
    const key = queryKeys.lists.detail(listId);
    return useMutation({
        mutationFn: (gameIds: number[]) => setListGames(listId, gameIds),
        onMutate: async (gameIds) => {
            await client.cancelQueries({ queryKey: key });
            const before = client.getQueryData<GameListDetail>(key);
            if (before) {
                const byId = new Map(before.games.map((e) => [e.game.id, e]));
                client.setQueryData<GameListDetail>(key, {
                    ...before,
                    gameCount: gameIds.length,
                    games: gameIds.flatMap((id, i) => {
                        const entry = byId.get(id);
                        return entry ? [{ ...entry, rank: i + 1 }] : [];
                    }),
                });
            }
            return { before };
        },
        onError: (_error, _ids, context) => {
            if (context?.before) client.setQueryData(key, context.before);
        },
        onSuccess: (list) => settle(list),
    });
};

/** In or out of one of your lists, ticked at once in the picker. */
export const useToggleListGame = (gameId: number) => {
    const client = useQueryClient();
    const settle = useSettle();
    const key = queryKeys.lists.mine(gameId);
    return useMutation({
        mutationFn: ({ listId, add }: { listId: number; add: boolean }) =>
            add ? addListGame(listId, gameId) : removeListGame(listId, gameId),
        onMutate: async ({ listId, add }) => {
            await client.cancelQueries({ queryKey: key });
            const before = client.getQueryData<MyListOption[]>(key);
            client.setQueryData<MyListOption[]>(key, (lists) =>
                lists?.map((list) =>
                    list.id === listId
                        ? {
                              ...list,
                              hasGame: add,
                              gameCount: list.gameCount + (add ? 1 : -1),
                          }
                        : list
                )
            );
            return { before };
        },
        onError: (_error, _vars, context) => {
            if (context?.before) client.setQueryData(key, context.before);
        },
        onSettled: () => settle(),
    });
};

export const useListVote = (listId: number) => {
    const client = useQueryClient();
    return useMutation({
        mutationFn: () => toggleListVote(listId),
        onSuccess: (result) => {
            client.setQueryData<GameListDetail>(
                queryKeys.lists.detail(listId),
                (list) => list && { ...list, ...result }
            );
            return client.invalidateQueries({
                queryKey: queryKeys.lists.all,
                predicate: (query) => query.queryKey[1] !== "detail",
            });
        },
    });
};

/** A game onto the end of a list, from the list's own page. */
export const useAddToList = (listId: number) => {
    const client = useQueryClient();
    return useMutation({
        mutationFn: (gameId: number) => addListGame(listId, gameId),
        onSuccess: () =>
            client.invalidateQueries({ queryKey: queryKeys.lists.all }),
    });
};
