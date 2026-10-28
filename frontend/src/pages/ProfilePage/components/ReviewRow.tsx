import { Link } from "react-router-dom";
import { Pin } from "lucide-react";
import type { ReviewWithAuthor } from "@playrates/shared";
import GameCover from "../../../components/game/GameCover";
import RatingBadge from "../../../components/ui/RatingBadge";
import { SpoilerNote } from "../../../components/ui/SpoilerCover";
import StatusBadge from "../../../components/ui/StatusBadge";
import {
    displayStatusFor,
    isDisplayStatus,
    type DisplayStatus,
    type GameStatus,
    type PlayedStatus,
} from "../../../constants/gameStatus";
import { formatHours, relativeTime } from "../../../lib/format";
import { cn } from "../../../lib/cn";

/** The state a review was written in, when its author still has that log. */
const reviewStatus = (review: ReviewWithAuthor): DisplayStatus | null => {
    if (!review.status || !isDisplayStatus(review.status)) return null;
    return displayStatusFor(
        review.status as GameStatus,
        review.playedStatus as PlayedStatus | null
    );
};

/** One of somebody's reviews. The view carries the game, so no fan-out.
 *  On its owner's own, with a pin to put it on their profile. */
const ReviewRow = ({
    review,
    pin,
}: {
    review: ReviewWithAuthor;
    pin?: { on: boolean; toggle: () => void };
}) => {
    const status = reviewStatus(review);

    const row = (
        // Straight to the review on the game's page, not just to the game.
        <Link
            to={`/game/${review.game.id}#review-${review.id}`}
            className={cn(
                "flex gap-3 rounded-md p-2 lift hover:bg-surface-hover",
                pin && "pr-12"
            )}
        >
            <GameCover
                coverUrl={review.game.coverUrl}
                title={review.game.title}
                /* self-start: the row stretches its children to the review's
                   height by default, which overrides the aspect ratio — a
                   long review made a cover three times as tall as it is
                   wide. */
                className="aspect-3/4 w-11 shrink-0 self-start overflow-hidden rounded-xs shadow-cover"
            />

            <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                    <span className="font-display text-base leading-tight text-content sm:text-lg">
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
                    {status && <StatusBadge status={status} />}
                    {/* The hours are what the rating was worth at the time
                        it was written. */}
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
    );
    if (!pin) return row;
    // Beside the link rather than in it: a button can't sit inside one.
    return (
        <div className="relative">
            {row}
            <button
                type="button"
                aria-pressed={pin.on}
                aria-label={
                    pin.on
                        ? `Unpin ${review.game.title} from your profile`
                        : `Pin ${review.game.title} to your profile`
                }
                onClick={pin.toggle}
                className={cn(
                    "absolute top-2 right-2 grid size-9 cursor-pointer place-items-center rounded-sm",
                    "focus-visible:outline-2 focus-visible:outline-brand",
                    pin.on
                        ? "bg-brand-subtle text-brand"
                        : "text-content-muted hover:bg-surface-hover hover:text-content"
                )}
            >
                <Pin
                    size={15}
                    fill={pin.on ? "currentColor" : "none"}
                    aria-hidden
                />
            </button>
        </div>
    );
};

export default ReviewRow;
