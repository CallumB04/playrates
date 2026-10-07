import type {
    Paginated,
    ReviewSort,
    ReviewWithAuthor,
} from "@playrates/shared";
import { api } from "../client";
import { compactParams } from "./games";

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

/** Toggles the caller's vote. Idempotent by primary key on the server. */
export const toggleReviewVote = async (
    reviewId: number
): Promise<{ voteCount: number; votedByViewer: boolean }> => {
    const { data } = await api.post<{
        voteCount: number;
        votedByViewer: boolean;
    }>(`/reviews/${reviewId}/vote`);
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

export const fetchUserReviews = async (
    username: string
): Promise<Paginated<ReviewWithAuthor>> => {
    const { data } = await api.get<Paginated<ReviewWithAuthor>>(
        `/users/${username}/reviews`
    );
    return data;
};
