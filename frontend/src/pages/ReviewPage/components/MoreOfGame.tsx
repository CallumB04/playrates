import { Link } from "react-router-dom";
import type { ReviewGame } from "@playrates/shared";
import ProfilePicture, {
    PrivateProfilePicture,
} from "../../../components/ProfilePicture";
import { cardClass } from "../../../components/ui/cardClass";
import RatingBadge from "../../../components/ui/RatingBadge";
import { TextSkeleton } from "../../../components/ui/Skeleton";
import { SpoilerNote } from "../../../components/ui/SpoilerCover";
import StatusBadge from "../../../components/ui/StatusBadge";
import { useGameReviews } from "../../../hooks/queries/useReviews";
import { formatCount, formatHours, relativeTime } from "../../../lib/format";
import { reviewStatus } from "../../../lib/reviewStatus";

const SHOWN = 4;

/** What everyone else made of the game, the most helpful first. Nothing at
 *  all when this is the only review: an empty section is just noise. */
const MoreOfGame = ({
    game,
    reviewId,
}: {
    game: ReviewGame;
    reviewId: number;
}) => {
    const { data, isPending } = useGameReviews(game.id, "helpful");
    const others = (data?.data ?? []).filter((r) => r.id !== reviewId);
    const total = Math.max((data?.meta.total ?? 0) - 1, others.length);
    if (!isPending && others.length === 0) return null;

    return (
        <section className="flex flex-col gap-3">
            <h2 className="font-display text-section text-content">
                More reviews of {game.title}
            </h2>
            {isPending ? (
                <TextSkeleton lines={6} />
            ) : (
                <div
                    className={cardClass("divide-y divide-subtle p-1", {
                        padding: "none",
                    })}
                >
                    {others.slice(0, SHOWN).map((review) => {
                        const { author } = review;
                        const status = reviewStatus(review);
                        return (
                            <Link
                                key={review.id}
                                to={`/review/${review.id}`}
                                className="block rounded-md px-3 py-3 lift hover:bg-surface-hover"
                            >
                                <span className="flex items-center gap-2.5">
                                    {author ? (
                                        <ProfilePicture
                                            variant="nav"
                                            file={author.avatarUrl ?? ""}
                                            accent={author.accent}
                                            username={author.username}
                                            link={false}
                                        />
                                    ) : (
                                        <PrivateProfilePicture variant="nav" />
                                    )}
                                    <span className="min-w-0 flex-1 truncate text-body-sm font-medium text-content">
                                        {author?.username ?? "Private account"}
                                    </span>
                                    {review.rating !== null && (
                                        <RatingBadge
                                            value={review.rating}
                                            size="row"
                                        />
                                    )}
                                </span>
                                {review.containsSpoilers ? (
                                    <SpoilerNote className="mt-2" />
                                ) : (
                                    <span className="mt-2 line-clamp-3 block text-body-sm leading-relaxed text-content-secondary">
                                        {review.body}
                                    </span>
                                )}
                                <span className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-label-sm text-content-muted">
                                    {status && <StatusBadge status={status} />}
                                    {review.hoursPlayed !== null && (
                                        <span>
                                            Reviewed at{" "}
                                            <span className="font-mono">
                                                {formatHours(
                                                    review.hoursPlayed
                                                )}
                                            </span>{" "}
                                            played
                                        </span>
                                    )}
                                    <span>
                                        {relativeTime(review.createdAt)}
                                    </span>
                                </span>
                            </Link>
                        );
                    })}
                </div>
            )}
            {total > SHOWN && (
                <Link
                    to={`/game/${game.id}`}
                    className="self-start text-body-sm font-medium text-brand-text hover:underline"
                >
                    All {formatCount(total + 1)} reviews of {game.title}
                </Link>
            )}
        </section>
    );
};

export default MoreOfGame;
