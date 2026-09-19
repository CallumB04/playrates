import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReviewInput } from "@playrates/shared";
import {
    deleteReview,
    fetchGameReviews,
    fetchUserReviews,
    queryKeys,
    saveReview,
} from "../../api";

export const useGameReviews = (gameId: number | undefined) =>
    useQuery({
        queryKey: queryKeys.reviews.byGame(gameId ?? 0),
        queryFn: () => fetchGameReviews(gameId!),
        enabled: typeof gameId === "number" && gameId > 0,
    });

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
