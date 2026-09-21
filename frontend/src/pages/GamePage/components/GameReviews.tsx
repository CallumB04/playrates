import type { ReviewSort, ReviewWithAuthor } from "@playrates/shared";
import { Link } from "react-router-dom";
import ProfilePicture from "../../../components/ProfilePicture";
import EmptyPlate from "../../../components/ui/EmptyPlate";
import { TextSkeleton } from "../../../components/ui/Skeleton";
import Dropdown from "../../../components/ui/Dropdown";
import StatusBadge from "../../../components/ui/StatusBadge";
import RatingBadge from "../../../components/ui/RatingBadge";
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
                body="Log this game and write one. Someone deciding whether to start it will read it."
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
                                <span className="font-mono text-label-sm text-content-muted">
                                    {formatHours(review.hoursPlayed)} in
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
                    <RatingBadge value={review.rating} size="md" />
                </article>
            ))
        )}
    </section>
);

export default GameReviews;
