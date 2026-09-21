import type {
    Paginated,
    Review,
    ReviewInput,
    ReviewSort,
    ReviewWithAuthor,
} from "@playrates/shared";
import axios from "axios";
import { api } from "../client";
import { compactParams } from "./games";

const isNotFound = (error: unknown): boolean =>
    axios.isAxiosError(error) && error.response?.status === 404;

export const fetchGameReviews = async (
    gameId: number,
    sort?: ReviewSort
): Promise<Paginated<ReviewWithAuthor>> => {
    const { data } = await api.get<Paginated<ReviewWithAuthor>>(
        `/games/${gameId}/reviews`,
        { params: compactParams({ sort }) }
    );
    return data;
};

/** Public reviews from across the site, newest first. */
export const fetchRecentReviews = async (
    limit: number
): Promise<Paginated<ReviewWithAuthor>> => {
    const { data } = await api.get<Paginated<ReviewWithAuthor>>("/reviews", {
        params: { limit },
    });
    return data;
};

/** The caller's own review of a game, for prefilling the log editor. */
export const fetchMyReview = async (
    gameId: number
): Promise<Review | null> => {
    try {
        const { data } = await api.get<Review>(`/me/reviews/${gameId}`);
        return data;
    } catch (error) {
        // No review yet is the common case, not a failure.
        if (isNotFound(error)) return null;
        throw error;
    }
};

export const fetchUserReviews = async (
    username: string
): Promise<Paginated<ReviewWithAuthor>> => {
    const { data } = await api.get<Paginated<ReviewWithAuthor>>(
        `/users/${username}/reviews`
    );
    return data;
};

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
