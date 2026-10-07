import {
    keepPreviousData,
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import type { ReviewSort } from "@playrates/shared";
import {
    fetchGameReviews,
    fetchRecentReviews,
    fetchUserReviews,
    toggleReviewVote,
    queryKeys,
} from "../../api";

export const useGameReviews = (gameId: number | undefined, sort?: ReviewSort) =>
    useQuery({
        queryKey: queryKeys.reviews.byGame(gameId ?? 0, sort),
        queryFn: () => fetchGameReviews(gameId!, sort),
        enabled: typeof gameId === "number" && gameId > 0,
        placeholderData: keepPreviousData,
    });

export const useRecentReviews = (limit: number) =>
    useQuery({
        queryKey: queryKeys.reviews.recent,
        queryFn: () => fetchRecentReviews(limit),
        staleTime: 60_000,
    });

export const useUserReviews = (username: string | undefined) =>
    useQuery({
        queryKey: queryKeys.reviews.byUsername(username ?? ""),
        queryFn: () => fetchUserReviews(username!),
        enabled: !!username,
    });

/** Refetch rather than patch: the same review sits in the game list, the site
 *  feed and a profile, and three hand-patched copies drift. */
export const useReviewVote = () => {
    const client = useQueryClient();
    return useMutation({
        mutationFn: (reviewId: number) => toggleReviewVote(reviewId),
        onSuccess: () => {
            void client.invalidateQueries({ queryKey: ["reviews"] });
        },
    });
};
