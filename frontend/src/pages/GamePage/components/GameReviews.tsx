import type { ReviewSort, ReviewWithAuthor } from "@playrates/shared";
import { Link } from "react-router-dom";
import ProfilePicture from "../../../components/ProfilePicture";
import EmptyPlate from "../../../components/ui/EmptyPlate";
import { TextSkeleton } from "../../../components/ui/Skeleton";
import Dropdown from "../../../components/ui/Dropdown";
import StatusBadge from "../../../components/ui/StatusBadge";
import RatingBadge from "../../../components/ui/RatingBadge";
import VoteButton from "../../../components/ui/VoteButton";
import Button from "../../../components/ui/Button";
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
    canVote: boolean;
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
    canVote,
    onVote,
    total,
    sort,
    onSortChange,
    isLoading,
}: GameReviewsProps) => (
    <section>
        <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-3 border-b border-subtle pb-2.5">
            <h2 className="font-display text-section text-content">
                Reviews
            </h2>
            <div className="flex items-center gap-4">
                <span className="text-label text-content-muted">
                    {formatCount(total)} {total === 1 ? "review" : "reviews"}
                </span>
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
                            {hasLog ? "Edit your log" : "Log this game"}
                        </Button>
                    ) : undefined
                }
            />
        ) : (
            reviews.map((review) => (
                <article
                    key={review.id}
                    id={`review-${review.id}`}
                    className="grid grid-cols-[38px_minmax(0,1fr)_auto] gap-4 border-b border-subtle py-4 last:border-b-0 target:bg-brand-subtle"
                >
                    <ProfilePicture
                        variant="friendRow"
                        file={review.author.avatarUrl ?? ""}
                        username={review.author.username}
                        link={false}
                    />
                    <div className="min-w-0">
                        <div className="mb-1.5 flex flex-wrap items-baseline gap-2.5">
                            <Link
                                to={`/user/${review.author.username}`}
                                className="text-body-sm font-semibold text-content hover:text-brand"
                            >
                                {review.author.username}
                            </Link>
                            {reviewStatus(review) && (
                                <StatusBadge status={reviewStatus(review)!} />
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
                        <p className="max-w-[46ch] text-sm leading-relaxed text-content-secondary">
                            {review.body}
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <RatingBadge value={review.rating} size="md" />
                        <VoteButton
                            count={review.voteCount}
                            voted={review.votedByViewer}
                            disabled={!canVote}
                            onToggle={() => onVote?.(review.id)}
                        />
                    </div>
                </article>
            ))
        )}
    </section>
);

export default GameReviews;
