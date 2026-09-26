import { Link } from "react-router-dom";
import type { ReviewWithAuthor } from "@playrates/shared";
import Panel from "../../../components/ui/Panel";
import GameCover from "../../../components/game/GameCover";
import { buttonClass } from "../../../components/ui/Button";
import RatingBadge from "../../../components/ui/RatingBadge";
import { SpoilerNote } from "../../../components/ui/SpoilerCover";
import StatusBadge from "../../../components/ui/StatusBadge";
import { TextSkeleton } from "../../../components/ui/Skeleton";
import {
    displayStatusFor,
    isDisplayStatus,
    type DisplayStatus,
    type GameStatus,
    type PlayedStatus,
} from "../../../constants/gameStatus";
import { formatHours, relativeTime } from "../../../lib/format";

interface RecentReviewsProps {
    reviews: ReviewWithAuthor[];
    isLoading: boolean;
    /** Own profile gets a prompt to write one; a visitor does not. */
    isOwner: boolean;
}

const SHOWN = 4;

/** Somebody's last few reviews. The view carries the game, so no fan-out. */
/** The state a review was written in, when its author still has that log. */
const reviewStatus = (review: ReviewWithAuthor): DisplayStatus | null => {
    if (!review.status || !isDisplayStatus(review.status)) return null;
    return displayStatusFor(
        review.status as GameStatus,
        review.playedStatus as PlayedStatus | null
    );
};

const RecentReviews = ({ reviews, isLoading, isOwner }: RecentReviewsProps) => {
    const shown = reviews.slice(0, SHOWN);

    return (
        <Panel title="Recent reviews" bodyClassName="flex flex-col gap-1 p-2">
            {/* An unfetched list is not an empty one, so it does not get the
                empty state's sentence. */}
            {isLoading ? (
                <div className="px-2 py-3">
                    <TextSkeleton lines={5} />
                </div>
            ) : shown.length === 0 ? (
                <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
                    <p className="text-body-sm text-content-muted">
                        {isOwner
                            ? "No reviews yet."
                            : "No reviews written yet."}
                    </p>
                    {isOwner && (
                        <Link
                            to="/library"
                            className={buttonClass(
                                "secondary",
                                "min-h-11 sm:min-h-9",
                                "sm"
                            )}
                        >
                            Find a game to review
                        </Link>
                    )}
                </div>
            ) : (
                shown.map((review) => (
                    // Straight to the review on the game's page, not just to the game.
                    <Link
                        key={review.id}
                        to={`/game/${review.game.id}#review-${review.id}`}
                        className="flex gap-3 rounded-md p-2 lift hover:bg-surface-hover"
                    >
                        <GameCover
                            coverUrl={review.game.coverUrl}
                            title={review.game.title}
                            /* self-start: the row stretches its children to
                               the review's height by default, which overrides
                               the aspect ratio — a long review made a cover
                               three times as tall as it is wide. */
                            className="aspect-3/4 w-11 shrink-0 self-start overflow-hidden rounded-xs shadow-cover"
                        />

                        <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                                <span className="font-display text-lg leading-tight text-content">
                                    {review.game.title}
                                </span>
                                {review.rating !== null && (
                                    <RatingBadge value={review.rating} />
                                )}
                            </span>

                            {review.containsSpoilers ? (
                                <SpoilerNote className="mt-1.5" />
                            ) : (
                                <span className="mt-1.5 line-clamp-3 block text-sm leading-relaxed text-content-secondary">
                                    {review.body}
                                </span>
                            )}

                            <span className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-label-sm text-content-muted">
                                {reviewStatus(review) && (
                                    <StatusBadge
                                        status={reviewStatus(review)!}
                                        plain
                                    />
                                )}
                                {/* The hours are what the rating was worth at
                                    the time it was written. */}
                                {review.hoursPlayed !== null && (
                                    <span>
                                        Reviewed at{" "}
                                        <span className="font-mono">
                                            {formatHours(review.hoursPlayed)}
                                        </span>{" "}
                                        played
                                    </span>
                                )}
                                <span>{relativeTime(review.createdAt)}</span>
                            </span>
                        </span>
                    </Link>
                ))
            )}
        </Panel>
    );
};

export default RecentReviews;
