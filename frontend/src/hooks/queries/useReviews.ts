import {
    keepPreviousData,
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import type { ReviewSort, ReactionKey } from "@playrates/shared";
import {
    fetchGameReviews,
    fetchRecentReviews,
    fetchUserReviews,
    fetchPinnedReviews,
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

interface UserReviewsOptions {
    page?: number;
    /** Left out, the server's default page size. */
    limit?: number;
    enabled?: boolean;
}

export const useUserReviews = (
    username: string | undefined,
    { page, limit, enabled = true }: UserReviewsOptions = {}
) =>
    useQuery({
        queryKey: queryKeys.reviews.byUsername(username ?? "", page, limit),
        queryFn: () => fetchUserReviews(username!, { page, limit }),
        enabled: enabled && !!username,
        placeholderData: keepPreviousData,
    });

export const usePinnedReviews = (
    username: string,
    ids: number[],
    enabled = true
) =>
    useQuery({
        queryKey: queryKeys.reviews.pinned(username, ids),
        queryFn: () => fetchPinnedReviews(username),
        enabled: enabled && ids.length > 0,
    });

/** Refetch rather than patch: the same review sits in the game list, the site
 *  feed and a profile, and three hand-patched copies drift. */
export const useReviewVote = () => {
    const client = useQueryClient();
    return useMutation({
        mutationFn: ({
            reviewId,
            reaction,
        }: {
            reviewId: number;
            reaction?: ReactionKey;
        }) => toggleReviewVote(reviewId, reaction),
        onSuccess: () => {
            void client.invalidateQueries({ queryKey: ["reviews"] });
        },
    });
};
