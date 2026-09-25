import { useEffect, useRef, useState } from "react";
import type { ReviewSort, ReviewWithAuthor } from "@playrates/shared";
import { Link } from "react-router-dom";
import ProfilePicture from "../../../components/ProfilePicture";
import EmptyPlate from "../../../components/ui/EmptyPlate";
import { TextSkeleton } from "../../../components/ui/Skeleton";
import Dropdown from "../../../components/ui/Dropdown";
import StatusBadge from "../../../components/ui/StatusBadge";
import ExpandableText from "./ExpandableText";
import { cn } from "../../../lib/cn";
import RatingBadge from "../../../components/ui/RatingBadge";
import VoteButton from "../../../components/ui/VoteButton";
import { whyCannotVote } from "../../../lib/voting";
import Button from "../../../components/ui/Button";
import { PenLine } from "lucide-react";
import {
    displayStatusFor,
    isDisplayStatus,
    type DisplayStatus,
    type GameStatus,
    type PlayedStatus,
} from "../../../constants/gameStatus";
import { formatCount, formatHours, relativeTime } from "../../../lib/format";

interface GameReviewsProps {
    reviews: ReviewWithAuthor[];
    /** Whether the viewer already has a log for this game. */
    hasLog: boolean;
    /** Opens the log editor. Omitted when signed out. */
    onWriteReview?: () => void;
    /** Who is looking, so their own reviews refuse a vote. Unset when signed
     *  out. */
    viewerId: string | undefined;
    onVote?: (reviewId: number) => void;
    total: number;
    sort: ReviewSort;
    onSortChange: (sort: ReviewSort) => void;
    isLoading: boolean;
}

/** The state a review was written in, when its author still has that log. */
const reviewStatus = (review: ReviewWithAuthor): DisplayStatus | null => {
    if (!review.status || !isDisplayStatus(review.status)) return null;
    return displayStatusFor(
        review.status as GameStatus,
        review.playedStatus as PlayedStatus | null
    );
};

const GameReviews = ({
    reviews,
    hasLog,
    onWriteReview,
    viewerId,
    onVote,
    total,
    sort,
    onSortChange,
    isLoading,
}: GameReviewsProps) => {
    /* A link to one review lands before the list has loaded, so the browser
       has nothing to scroll to and the card's :target styling is all that
       survives. Once: re-sorting should not yank the page back. */
    const jumped = useRef(false);
    const [landedOn, setLandedOn] = useState<string | null>(null);
    useEffect(() => {
        if (jumped.current || isLoading || reviews.length === 0) return;
        const id = window.location.hash.slice(1);
        if (!id) return;
        const target = document.getElementById(id);
        if (!target) return;
        jumped.current = true;
        target.scrollIntoView({ block: "center" });
        /* :target only matches on a real fragment navigation, so arriving
           from a link inside the app scrolls but never lights the card. */
        setLandedOn(id);
    }, [isLoading, reviews]);

    return (
        <section>
            <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-3 border-b border-subtle pb-2.5">
                <h2 className="font-display text-section text-content">
                    Reviews
                </h2>
                <div className="flex flex-wrap items-center gap-3">
                    <span className="text-label text-content-muted">
                        {formatCount(total)}{" "}
                        {total === 1 ? "review" : "reviews"}
                    </span>
                    {onWriteReview && (
                        // The empty state carries its own action, so skip it there.
                        <Button
                            size="sm"
                            onClick={onWriteReview}
                            className="min-h-11 sm:min-h-9"
                        >
                            <PenLine size={14} aria-hidden />
                            {hasLog ? "Edit review" : "Write a review"}
                        </Button>
                    )}
                    <Dropdown
                        options={[
                            { value: "recent", label: "Most recent" },
                            { value: "helpful", label: "Most helpful" },
                            { value: "oldest", label: "Oldest first" },
                            { value: "rating-high", label: "Highest rated" },
                            { value: "rating-low", label: "Lowest rated" },
                        ]}
                        value={sort}
                        onChange={(next) => onSortChange(next as ReviewSort)}
                        aria-label="Sort reviews"
                        className="w-40"
                    />
                </div>
            </div>

            {isLoading ? (
                <TextSkeleton lines={4} />
            ) : reviews.length === 0 ? (
                <EmptyPlate
                    title="No reviews yet"
                    body={
                        hasLog
                            ? "You have logged this one. Add a review to your log and it shows up here."
                            : "Log this game to write the first one."
                    }
                    action={
                        onWriteReview ? (
                            <Button onClick={onWriteReview}>
                                {hasLog ? "Add review" : "Log this game"}
                            </Button>
                        ) : undefined
                    }
                />
            ) : (
                reviews.map((review) => (
                    <article
                        key={review.id}
                        id={`review-${review.id}`}
                        className={cn(
                            "grid grid-cols-[38px_minmax(0,1fr)_auto] gap-4 border-b border-subtle py-4 last:border-b-0 target:bg-brand-subtle",
                            landedOn === `review-${review.id}` &&
                                "bg-brand-subtle"
                        )}
                    >
                        <ProfilePicture
                            variant="friendRow"
                            file={review.author.avatarUrl ?? ""}
                            accent={review.author.accent}
                            username={review.author.username}
                            link={false}
                        />
                        <div className="min-w-0">
                            <div className="mb-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                                <Link
                                    to={`/user/${review.author.username}`}
                                    className="text-body-sm font-semibold text-content hover:text-brand"
                                >
                                    {review.author.username}
                                </Link>
                                {reviewStatus(review) && (
                                    <StatusBadge
                                        status={reviewStatus(review)!}
                                        plain
                                    />
                                )}
                                {review.hoursPlayed !== null && (
                                    <span className="text-label-sm text-content-muted">
                                        Reviewed at{" "}
                                        <span className="font-mono">
                                            {formatHours(review.hoursPlayed)}
                                        </span>{" "}
                                        played
                                    </span>
                                )}
                                <span className="text-label-sm text-content-muted">
                                    {relativeTime(review.createdAt)}
                                </span>
                            </div>
                            {/* The full width of the row: a review is prose,
                                and a character cap made every one of them a
                                narrow column with the rest of the row empty
                                beside it. */}
                            <ExpandableText
                                text={review.body}
                                lines={3}
                                className="text-sm"
                                moreLabel="Show more"
                            />
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <RatingBadge value={review.rating} size="row" />
                            <VoteButton
                                count={review.voteCount}
                                voted={review.votedByViewer}
                                disabledReason={whyCannotVote(
                                    viewerId,
                                    review.author.id
                                )}
                                onToggle={() => onVote?.(review.id)}
                            />
                        </div>
                    </article>
                ))
            )}
        </section>
    );
};

export default GameReviews;
