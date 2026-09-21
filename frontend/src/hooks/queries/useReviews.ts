import {
    keepPreviousData,
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import type { ReviewInput, ReviewSort } from "@playrates/shared";
import {
    deleteReview,
    fetchGameReviews,
    fetchMyReview,
    fetchRecentReviews,
    fetchUserReviews,
    toggleReviewVote,
    queryKeys,
    saveReview,
} from "../../api";
import { useAuth } from "../../contexts/AuthContext";

export const useGameReviews = (
    gameId: number | undefined,
    sort?: ReviewSort
) =>
    useQuery({
        queryKey: queryKeys.reviews.byGame(gameId ?? 0, sort),
        queryFn: () => fetchGameReviews(gameId!, sort),
        enabled: typeof gameId === "number" && gameId > 0,
        placeholderData: keepPreviousData,
    });

/** The caller's own review, so the editor can prefill it. */
export const useRecentReviews = (limit: number) =>
    useQuery({
        queryKey: queryKeys.reviews.recent,
        queryFn: () => fetchRecentReviews(limit),
        staleTime: 60_000,
    });

export const useMyReview = (gameId: number | undefined) => {
    const { user } = useAuth();
    return useQuery({
        queryKey: queryKeys.reviews.mine(gameId ?? 0),
        queryFn: () => fetchMyReview(gameId!),
        enabled: !!user && typeof gameId === "number" && gameId > 0,
    });
};

export const useUserReviews = (username: string | undefined) =>
    useQuery({
        queryKey: queryKeys.reviews.byUsername(username ?? ""),
        queryFn: () => fetchUserReviews(username!),
        enabled: !!username,
    });

/**
 * Voting refetches rather than patching the cache: a review appears in the
 * game list, the site feed and a profile, and keeping three copies in step by
 * hand is how they drift apart.
 */
export const useReviewVote = () => {
    const client = useQueryClient();
    return useMutation({
        mutationFn: (reviewId: number) => toggleReviewVote(reviewId),
        onSuccess: () => {
            void client.invalidateQueries({ queryKey: ["reviews"] });
        },
    });
};

export const useReviewMutations = () => {
    const queryClient = useQueryClient();

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ["reviews"] });
    };

    const save = useMutation({
        mutationFn: ({
            gameId,
            input,
        }: {
            gameId: number;
            input: ReviewInput;
        }) => saveReview(gameId, input),
        onSuccess: invalidate,
    });

    const remove = useMutation({
        mutationFn: (gameId: number) => deleteReview(gameId),
        onSuccess: invalidate,
    });

    return { save, remove };
};
