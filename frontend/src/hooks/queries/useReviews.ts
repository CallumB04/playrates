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
    fetchUserReviews,
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
