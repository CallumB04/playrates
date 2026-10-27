import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchUserFavourites, queryKeys, setMyFavourites } from "../../api";
import { useAuth } from "../../contexts/AuthContext";

export const useUserFavourites = (username: string, enabled = true) =>
    useQuery({
        queryKey: queryKeys.favourites.byUsername(username),
        queryFn: () => fetchUserFavourites(username),
        enabled: enabled && !!username,
    });

/** The answer is the new list, so it goes straight into the cache. */
export const useSetFavourites = () => {
    const client = useQueryClient();
    const { user } = useAuth();
    return useMutation({
        mutationFn: (gameIds: number[]) => setMyFavourites(gameIds),
        onSuccess: (games) => {
            if (user) {
                client.setQueryData(
                    queryKeys.favourites.byUsername(user.username),
                    games
                );
            }
        },
    });
};
