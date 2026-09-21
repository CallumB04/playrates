import { Link } from "react-router-dom";
import type { ReviewWithAuthor } from "@playrates/shared";
import ProfilePicture from "../../../components/ProfilePicture";
import { TextSkeleton } from "../../../components/ui/Skeleton";
import RatingBadge from "../../../components/ui/RatingBadge";
import { formatHours, relativeTime } from "../../../lib/format";

const Row = ({ review }: { review: ReviewWithAuthor }) => (
    <Link
        to={`/game/${review.game.id}#review-${review.id}`}
        className="lift block rounded-md px-2.5 py-2.5 hover:bg-surface-hover"
    >
        <span className="flex items-center gap-2">
            <ProfilePicture
                variant="nav"
                file={review.author.avatarUrl ?? ""}
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
                <RatingBadge value={review.rating} bare />
            )}
        </span>

        <p className="mt-1.5 line-clamp-3 text-body-sm leading-relaxed text-content-secondary">
            {review.body}
        </p>

        <span className="mt-1.5 flex items-center gap-2 text-label-sm text-content-muted">
            {review.hoursPlayed !== null && (
                <span className="font-mono">
                    {formatHours(review.hoursPlayed)} in
                </span>
            )}
            <span>{relativeTime(review.createdAt)}</span>
        </span>
    </Link>
);

/**
 * Recent notes from across the site. The hours are shown next to the rating
 * because they change what it means: a nine after eighty hours is a different
 * claim from a nine after two.
 */
const ReviewFeed = ({
    reviews,
    isLoading,
}: {
    reviews: ReviewWithAuthor[];
    isLoading: boolean;
}) => (
    <section>
        <h2 className="mb-3 font-display text-section text-content">
            What people are saying
        </h2>

        <div className="flex flex-col">
            {isLoading ? (
                <TextSkeleton lines={5} />
            ) : reviews.length === 0 ? (
                <p className="rounded-md border border-dashed border-strong bg-surface-sunken/40 px-4 py-6 text-center text-body-sm text-content-muted">
                    No reviews yet.
                </p>
            ) : (
                reviews.map((review) => <Row key={review.id} review={review} />)
            )}
        </div>
    </section>
);

export default ReviewFeed;
