import type {
    Paginated,
    Review,
    ReviewInput,
    ReviewWithAuthor,
} from "@playrates/shared";
import { api } from "../client";

export const fetchGameReviews = async (
    gameId: number
): Promise<Paginated<ReviewWithAuthor>> => {
    const { data } = await api.get<Paginated<ReviewWithAuthor>>(
        `/games/${gameId}/reviews`
    );
    return data;
};

export const fetchUserReviews = async (
    username: string
): Promise<Paginated<ReviewWithAuthor>> => {
    const { data } = await api.get<Paginated<ReviewWithAuthor>>(
        `/users/${username}/reviews`
    );
    return data;
};

/** The write path the old API did not have at all. */
export const saveReview = async (
    gameId: number,
    input: ReviewInput
): Promise<Review> => {
    const { data } = await api.put<Review>(`/me/reviews/${gameId}`, input);
    return data;
};

export const deleteReview = async (gameId: number): Promise<void> => {
    await api.delete(`/me/reviews/${gameId}`);
};
