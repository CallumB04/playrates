import {
    keepPreviousData,
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import type { WishlistPage } from "@playrates/shared";
import {
    fetchShelfConsoles,
    fetchUserWishlist,
    queryKeys,
    setMyWishlistOrder,
} from "../../api";
import { useAuth } from "../../contexts/AuthContext";

export const useUserWishlist = (
    username: string,
    options: { system?: string; limit?: number } = {},
    enabled = true
) =>
    useQuery({
        queryKey: queryKeys.gameLogs.wishlist(
            username,
            options.system,
            options.limit
        ),
        queryFn: () => fetchUserWishlist(username, options),
        enabled: enabled && !!username,
        placeholderData: keepPreviousData,
    });

/**
 * Saves a new order, showing it straight away: the whole list moves on the
 * page at once, and goes back if the save fails. Every cached view of the
 * wishlist, filtered or cut to five, is put in the new order too.
 */
export const useReorderWishlist = () => {
    const client = useQueryClient();
    const { user } = useAuth();
    const all = queryKeys.gameLogs.wishlistAll(user?.username ?? "");

    return useMutation({
        mutationFn: (gameIds: number[]) => setMyWishlistOrder(gameIds),
        onMutate: async (gameIds) => {
            await client.cancelQueries({ queryKey: all });
            const before = client.getQueriesData<WishlistPage>({
                queryKey: all,
            });
            const rankOf = new Map(gameIds.map((id, i) => [id, i + 1]));
            client.setQueriesData<WishlistPage>(
                { queryKey: all },
                (page) =>
                    page && {
                        ...page,
                        data: page.data
                            .map((e) => ({
                                ...e,
                                rank: rankOf.get(e.gameId) ?? e.rank,
                            }))
                            .sort((a, b) => a.rank - b.rank),
                    }
            );
            return { before };
        },
        onError: (_error, _ids, context) => {
            for (const [key, page] of context?.before ?? []) {
                client.setQueryData(key, page);
            }
        },
        // The top five on the profile may now hold different games.
        onSettled: () => client.invalidateQueries({ queryKey: all }),
    });
};

export const useShelfConsoles = (
    username: string,
    status: string,
    enabled = true
) =>
    useQuery({
        queryKey: queryKeys.gameLogs.shelfConsoles(username, status),
        queryFn: () => fetchShelfConsoles(username, status),
        enabled: enabled && !!username,
        staleTime: 60_000,
    });
