import { Link } from "react-router-dom";
import { EmptyNote } from "../../../components/ui/EmptyPlate";
import type { ReviewWithAuthor } from "@playrates/shared";
import ProfilePicture from "../../../components/ProfilePicture";
import { TextSkeleton } from "../../../components/ui/Skeleton";
import RatingBadge from "../../../components/ui/RatingBadge";
import StatusBadge from "../../../components/ui/StatusBadge";
import {
    displayStatusFor,
    isDisplayStatus,
    type DisplayStatus,
    type GameStatus,
    type PlayedStatus,
} from "../../../constants/gameStatus";
import { formatHours, relativeTime } from "../../../lib/format";

/** The state a review was written in, when its author still has that log. */
const reviewStatus = (review: ReviewWithAuthor): DisplayStatus | null => {
    if (!review.status || !isDisplayStatus(review.status)) return null;
    return displayStatusFor(
        review.status as GameStatus,
        review.playedStatus as PlayedStatus | null
    );
};

const Row = ({ review }: { review: ReviewWithAuthor }) => {
    const status = reviewStatus(review);

    return (
        <Link
            to={`/game/${review.game.id}#review-${review.id}`}
            className="block rounded-md px-2.5 py-2.5 lift hover:bg-surface-hover"
        >
            <span className="flex items-center gap-2">
                <ProfilePicture
                    variant="nav"
                    file={review.author.avatarUrl ?? ""}
                    accent={review.author.accent}
                    username={review.author.username}
                    link={false}
                />
                <span className="min-w-0 flex-1 truncate text-body-sm text-content-secondary">
                    <span className="font-medium text-content">
                        {review.author.username}
                    </span>{" "}
                    on{" "}
                    <span className="font-medium text-content">
                        {review.game.title}
                    </span>
                </span>
                {review.rating !== null && (
                    <RatingBadge value={review.rating} size="row" />
                )}
            </span>

            <p className="mt-1.5 line-clamp-3 text-body-sm leading-relaxed text-content-secondary">
                {review.body}
            </p>

            <span className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-label-sm text-content-muted">
                {status && <StatusBadge status={status} plain />}
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
        </Link>
    );
};

/** Recent reviews from across the site. The hours sit next to the rating
 *  because a nine after eighty hours is a different claim from a nine after
 *  two. */
const ReviewFeed = ({
    reviews,
    isLoading,
}: {
    reviews: ReviewWithAuthor[];
    isLoading: boolean;
}) => (
    <section>
        <h2 className="mb-3 font-display text-section text-content">
            Recent reviews
        </h2>

        <div className="flex flex-col">
            {isLoading ? (
                <TextSkeleton lines={5} />
            ) : reviews.length === 0 ? (
                <EmptyNote>No reviews yet.</EmptyNote>
            ) : (
                reviews.map((review) => <Row key={review.id} review={review} />)
            )}
        </div>
    </section>
);

export default ReviewFeed;
