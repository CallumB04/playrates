import type {
    Paginated,
    ReviewSort,
    ReviewWithAuthor,
    ReactionKey,
    ReactionState,
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

/** Leaves the caller's reaction, or takes the same one back. One per
 *  person by primary key on the server. */
export const toggleReviewVote = async (
    reviewId: number,
    reaction: ReactionKey = "upvote"
): Promise<ReactionState> => {
    const { data } = await api.post<ReactionState>(
        `/reviews/${reviewId}/vote`,
        { reaction }
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

/** The reviews a member pinned to their profile, in their order. */
export const fetchPinnedReviews = async (
    username: string
): Promise<ReviewWithAuthor[]> => {
    const { data } = await api.get<ReviewWithAuthor[]>(
        `/users/${username}/reviews/pinned`
    );
    return data;
};

export const fetchUserReviews = async (
    username: string,
    page?: { page?: number; limit?: number }
): Promise<Paginated<ReviewWithAuthor>> => {
    const { data } = await api.get<Paginated<ReviewWithAuthor>>(
        `/users/${username}/reviews`,
        { params: compactParams(page ?? {}) }
    );
    return data;
};
