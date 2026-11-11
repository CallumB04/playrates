import { Link } from "react-router-dom";
import { EmptyNote } from "../../../components/ui/EmptyPlate";
import type { ReviewWithAuthor } from "@playrates/shared";
import ProfilePicture, {
    PrivateProfilePicture,
} from "../../../components/ProfilePicture";
import { SpoilerNote } from "../../../components/ui/SpoilerCover";
import { TextSkeleton } from "../../../components/ui/Skeleton";
import RatingBadge from "../../../components/ui/RatingBadge";
import StatusBadge from "../../../components/ui/StatusBadge";
import { reviewStatus } from "../../../lib/reviewStatus";
import { formatHours, relativeTime } from "../../../lib/format";
import { cn } from "../../../lib/cn";
import GameCover from "../../../components/game/GameCover";
import ArtBackdrop from "../../../components/game/ArtBackdrop";

/** A review on its game's art: the cover and the verdict up top, the words
 *  under them, and when it was written at the foot. */
const Row = ({ review }: { review: ReviewWithAuthor }) => {
    const status = reviewStatus(review);
    const { author } = review;

    return (
        <Link
            to={`/review/${review.id}`}
            className={cn(
                "group relative isolate flex h-full flex-col gap-3 overflow-hidden rounded-lg border border-subtle bg-surface-raised p-3.5 shadow-plate lift",
                "hover:-translate-y-px hover:border-strong hover:shadow-lifted",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            )}
        >
            <ArtBackdrop url={review.game.artworkUrl} fade="down" />

            <span className="flex items-start gap-3">
                <GameCover
                    sizes="48px"
                    coverUrl={review.game.coverUrl}
                    title={review.game.title}
                    className="aspect-3/4 w-12 shrink-0 overflow-hidden rounded-xs shadow-cover"
                />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex items-center gap-1.5 text-label-sm text-content-secondary">
                        {author ? (
                            <ProfilePicture
                                variant="tab"
                                file={author.avatarUrl ?? ""}
                                accent={author.accent}
                                username={author.username}
                                link={false}
                            />
                        ) : (
                            <PrivateProfilePicture variant="tab" />
                        )}
                        <span className="truncate font-medium text-content">
                            {author?.username ?? "Private account"}
                        </span>
                    </span>
                    <span className="line-clamp-2 text-body-sm font-semibold text-content group-hover:text-brand-text">
                        {review.game.title}
                    </span>
                </span>
                {review.rating !== null && (
                    <RatingBadge value={review.rating} size="row" />
                )}
            </span>

            {review.containsSpoilers ? (
                <SpoilerNote />
            ) : (
                <p className="line-clamp-3 text-body-sm leading-relaxed text-content-secondary">
                    {review.body}
                </p>
            )}

            <span className="mt-auto flex flex-wrap items-center gap-x-2.5 gap-y-1 text-label-sm text-content-muted">
                {status && <StatusBadge status={status} />}
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

        <div
            className={cn(
                "grid gap-3 sm:grid-cols-2",
                !isLoading && reviews.length > 0 && "stagger"
            )}
        >
            {isLoading ? (
                <div className="sm:col-span-2">
                    <TextSkeleton lines={5} />
                </div>
            ) : reviews.length === 0 ? (
                <EmptyNote className="sm:col-span-2">No reviews yet.</EmptyNote>
            ) : (
                reviews.map((review) => <Row key={review.id} review={review} />)
            )}
        </div>
    </section>
);

export default ReviewFeed;
