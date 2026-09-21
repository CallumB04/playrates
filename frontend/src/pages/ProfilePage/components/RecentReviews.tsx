import { Link } from "react-router-dom";
import type { ReviewWithAuthor } from "@playrates/shared";
import Panel from "../../../components/ui/Panel";
import GameCover from "../../../components/game/GameCover";
import { buttonClass } from "../../../components/ui/Button";
import { formatHours, formatRating, relativeTime } from "../../../lib/format";

interface RecentReviewsProps {
    reviews: ReviewWithAuthor[];
    /** Own profile gets a prompt to write one; a visitor does not. */
    isOwner: boolean;
}

const SHOWN = 4;

/**
 * Somebody's last few reviews.
 *
 * These used to fire one request per review to look up the game's title,
 * because reviews carried a gameId and nothing else. The review_cards view
 * carries the game now, so the fan-out is gone.
 */
const RecentReviews = ({ reviews, isOwner }: RecentReviewsProps) => {
    const shown = reviews.slice(0, SHOWN);

    return (
        <Panel
            title="Recent reviews"
            bodyClassName="flex flex-col gap-1 p-2"
        >
            {shown.length === 0 ? (
                <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
                    <p className="text-body-sm text-content-muted">
                        {isOwner
                            ? "No reviews yet."
                            : "No reviews written yet."}
                    </p>
                    {isOwner && (
                        <Link
                            to="/library"
                            className={buttonClass("secondary", undefined, "sm")}
                        >
                            Find a game to review
                        </Link>
                    )}
                </div>
            ) : (
                shown.map((review) => (
                    /* Straight to the review on the game's page, not just to
                       the game. */
                    <Link
                        key={review.id}
                        to={`/game/${review.game.id}#review-${review.id}`}
                        className="lift flex gap-3 rounded-md p-2 hover:bg-surface-hover"
                    >
                        <GameCover
                            coverUrl={review.game.coverUrl}
                            title={review.game.title}
                            className="aspect-3/4 w-11 shrink-0 overflow-hidden rounded-xs shadow-cover"
                        />

                        <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                                <span className="font-display text-lg leading-tight text-content">
                                    {review.game.title}
                                </span>
                                {review.rating !== null && (
                                    <span className="font-mono text-[13px] font-semibold text-brand">
                                        {formatRating(review.rating)}
                                    </span>
                                )}
                            </span>

                            <span className="mt-1.5 line-clamp-3 block text-sm leading-relaxed text-content-secondary">
                                {review.body}
                            </span>

                            <span className="mt-1.5 flex flex-wrap items-center gap-x-2.5 text-label-sm text-content-muted">
                                {/* The hours are what the rating was worth at
                                    the time it was written. */}
                                {review.hoursPlayed !== null && (
                                    <span className="font-mono">
                                        {formatHours(review.hoursPlayed)} played
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
