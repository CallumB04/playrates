import { useEffect, useRef, useState } from "react";
import type { ReviewSort, ReviewWithAuthor } from "@playrates/shared";
import { Link } from "react-router-dom";
import ProfilePicture, {
    PrivateProfilePicture,
} from "../../../components/ProfilePicture";
import EmptyPlate from "../../../components/ui/EmptyPlate";
import { TextSkeleton } from "../../../components/ui/Skeleton";
import Dropdown from "../../../components/ui/Dropdown";
import StatusBadge from "../../../components/ui/StatusBadge";
import ExpandableText from "./ExpandableText";
import SpoilerCover from "../../../components/ui/SpoilerCover";
import { cn } from "../../../lib/cn";
import RatingBadge from "../../../components/ui/RatingBadge";
import VoteButton from "../../../components/ui/VoteButton";
import { whyCannotVote } from "../../../lib/voting";
import Button from "../../../components/ui/Button";
import { Flag, PenLine } from "lucide-react";
import ReportDialog from "../../../components/ReportDialog";
import {
    displayStatusFor,
    isDisplayStatus,
    type DisplayStatus,
    type GameStatus,
    type PlayedStatus,
} from "../../../constants/gameStatus";
import { formatCount, formatHours, relativeTime } from "../../../lib/format";
import { usePlayedOn } from "../../../components/gamelog/usePlayedOn";
import { groupByAuthor } from "../lib/groupReviews";

interface GameReviewsProps {
    reviews: ReviewWithAuthor[];
    /** How many logs the viewer has of this game, one per console. */
    logCount: number;
    /** Opens the log editor. Omitted when signed out. */
    onWriteReview?: () => void;
    /** Who is looking, so their own reviews refuse a vote. Unset when signed
     *  out. */
    viewerId: string | undefined;
    onVote?: (reviewId: number) => unknown;
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
    logCount,
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
    const [reporting, setReporting] = useState<number | null>(null);
    const playedOn = usePlayedOn();
    const hasLog = logCount > 0;
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
                            variant="secondary"
                            size="sm"
                            onClick={onWriteReview}
                            className="min-h-11 sm:min-h-9"
                        >
                            <PenLine size={14} aria-hidden />
                            {logCount > 1
                                ? "Review a platform"
                                : hasLog
                                  ? "Edit review"
                                  : "Write a review"}
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
                            <Button variant="secondary" onClick={onWriteReview}>
                                {hasLog ? "Add review" : "Log this game"}
                            </Button>
                        ) : undefined
                    }
                />
            ) : (
                groupByAuthor(reviews).map(({ author, reviews: theirs }) => (
                    <article
                        key={`${author?.id ?? "private"}-${theirs[0]!.id}`}
                        className="grid grid-cols-[38px_minmax(0,1fr)] gap-4 border-b border-subtle py-4 last:border-b-0"
                    >
                        {author ? (
                            <ProfilePicture
                                variant="friendRow"
                                file={author.avatarUrl ?? ""}
                                accent={author.accent}
                                username={author.username}
                                link={false}
                            />
                        ) : (
                            <PrivateProfilePicture variant="friendRow" />
                        )}
                        <div className="flex min-w-0 flex-col">
                            {theirs.map((review, index) => {
                                const PlatformIcon = playedOn(review).Icon;
                                const platformName = playedOn(review).name;
                                return (
                                    <div
                                        key={review.id}
                                        id={`review-${review.id}`}
                                        className={cn(
                                            "grid grid-cols-[minmax(0,1fr)_auto] gap-4 target:bg-brand-subtle",
                                            index > 0 &&
                                                "mt-4 border-t border-dashed border-subtle pt-4",
                                            landedOn ===
                                                `review-${review.id}` &&
                                                "bg-brand-subtle"
                                        )}
                                    >
                                        <div className="min-w-0">
                                            <div className="mb-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                                                {index === 0 &&
                                                    (author ? (
                                                        <Link
                                                            to={`/user/${author.username}`}
                                                            className="text-body-sm font-semibold text-content hover:text-brand"
                                                        >
                                                            {author.username}
                                                        </Link>
                                                    ) : (
                                                        <span className="text-body-sm font-semibold text-content-secondary">
                                                            Private account
                                                        </span>
                                                    ))}
                                                {/* Which console the take is
                                                    about: a port can be a
                                                    different game. */}
                                                {platformName && (
                                                    <span className="inline-flex items-center gap-1.5 text-label-sm text-content-secondary">
                                                        <PlatformIcon
                                                            size={13}
                                                            aria-hidden
                                                        />
                                                        {platformName}
                                                    </span>
                                                )}
                                                {reviewStatus(review) && (
                                                    <StatusBadge
                                                        status={reviewStatus(
                                                            review
                                                        )!}
                                                        plain
                                                    />
                                                )}
                                                {review.hoursPlayed !==
                                                    null && (
                                                    <span className="text-label-sm text-content-muted">
                                                        Reviewed at{" "}
                                                        <span className="font-mono">
                                                            {formatHours(
                                                                review.hoursPlayed
                                                            )}
                                                        </span>{" "}
                                                        played
                                                    </span>
                                                )}
                                                <span className="text-label-sm text-content-muted">
                                                    {relativeTime(
                                                        review.createdAt
                                                    )}
                                                </span>
                                            </div>
                                            {/* The full width of the row: a
                                                review is prose, and a
                                                character cap made every one
                                                of them a narrow column with
                                                the rest of the row empty
                                                beside it. */}
                                            <SpoilerCover
                                                covered={
                                                    review.containsSpoilers
                                                }
                                                revealLabel="Show review"
                                            >
                                                <ExpandableText
                                                    text={review.body}
                                                    lines={3}
                                                    className="text-sm"
                                                    moreLabel="Show more"
                                                />
                                            </SpoilerCover>
                                            {viewerId &&
                                                viewerId !== author?.id && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() =>
                                                            setReporting(
                                                                review.id
                                                            )
                                                        }
                                                        className="mt-1 -ml-2.5 min-h-11 px-2.5 text-content-muted sm:min-h-8"
                                                    >
                                                        <Flag
                                                            size={13}
                                                            aria-hidden
                                                        />
                                                        Report
                                                    </Button>
                                                )}
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <RatingBadge
                                                value={review.rating}
                                                size="row"
                                            />
                                            <VoteButton
                                                count={review.voteCount}
                                                voted={review.votedByViewer}
                                                disabledReason={whyCannotVote(
                                                    viewerId,
                                                    author?.id
                                                )}
                                                onToggle={() =>
                                                    onVote?.(review.id)
                                                }
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </article>
                ))
            )}
            {reporting !== null && (
                <ReportDialog
                    targetType="review"
                    targetId={reporting}
                    onClose={() => setReporting(null)}
                />
            )}
        </section>
    );
};

export default GameReviews;
