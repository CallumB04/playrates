import { Link } from "react-router-dom";
import type { ReviewWithAuthor } from "@playrates/shared";
import ProfilePicture from "../../../components/ProfilePicture";
import Panel from "../../../components/ui/Panel";
import { TextSkeleton } from "../../../components/ui/Skeleton";
import { formatHours, formatRating, relativeTime } from "../../../lib/format";

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
                <span className="shrink-0 font-mono text-figure-sm text-brand">
                    {formatRating(review.rating)}
                </span>
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
    <Panel title="What people are saying" bodyClassName="flex flex-col p-1.5">
        {isLoading ? (
            <div className="p-2">
                <TextSkeleton lines={5} />
            </div>
        ) : reviews.length === 0 ? (
            <p className="px-2 py-6 text-center text-body-sm text-content-muted">
                No reviews yet. Be the first to write one.
            </p>
        ) : (
            reviews.map((review) => <Row key={review.id} review={review} />)
        )}
    </Panel>
);

export default ReviewFeed;
