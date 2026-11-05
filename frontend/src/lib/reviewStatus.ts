import type { ReviewWithAuthor } from "@playrates/shared";
import {
    displayStatusFor,
    isDisplayStatus,
    type DisplayStatus,
    type GameStatus,
    type PlayedStatus,
} from "../constants/gameStatus";

/** The state a review was written in, when its author still has that log. */
export const reviewStatus = (
    review: Pick<ReviewWithAuthor, "status" | "playedStatus">
): DisplayStatus | null => {
    if (!review.status || !isDisplayStatus(review.status)) return null;
    return displayStatusFor(
        review.status as GameStatus,
        review.playedStatus as PlayedStatus | null
    );
};
