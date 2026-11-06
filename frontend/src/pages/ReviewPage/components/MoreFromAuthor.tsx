import { Link } from "react-router-dom";
import GameCover from "../../../components/game/GameCover";
import AsideCard from "../../../components/ui/AsideCard";
import RatingBadge from "../../../components/ui/RatingBadge";
import { TextSkeleton } from "../../../components/ui/Skeleton";
import { useUserReviews } from "../../../hooks/queries/useReviews";
import { relativeTime } from "../../../lib/format";
import { profilePath } from "../../../lib/profilePaths";

const SHOWN = 5;

/** The author's other reviews. Only for an author the viewer can see: the
 *  review names nobody otherwise, and the list behind it goes through the
 *  profile gate. */
const MoreFromAuthor = ({
    username,
    reviewId,
}: {
    username: string;
    reviewId: number;
}) => {
    const { data, isPending, isError } = useUserReviews(username, {
        limit: SHOWN + 1,
    });
    const others = (data?.data ?? [])
        .filter((r) => r.id !== reviewId)
        .slice(0, SHOWN);
    if (isError || (!isPending && others.length === 0)) return null;

    return (
        <AsideCard
            title={`More from ${username}`}
            bodyClassName="flex flex-col px-1.5 pb-1.5"
        >
            {isPending ? (
                <div className="px-1.5">
                    <TextSkeleton lines={4} />
                </div>
            ) : (
                others.map((review) => (
                    <Link
                        key={review.id}
                        to={`/review/${review.id}`}
                        className="flex items-center gap-3 rounded-md px-1.5 py-1.5 lift hover:bg-surface-hover"
                    >
                        <GameCover
                            coverUrl={review.game.coverUrl}
                            title={review.game.title}
                            className="aspect-3/4 w-9 shrink-0 overflow-hidden rounded-xs shadow-cover"
                        />
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-body-sm font-medium text-content">
                                {review.game.title}
                            </span>
                            <span className="block text-label-sm text-content-muted">
                                {relativeTime(review.createdAt)}
                            </span>
                        </span>
                        {review.rating !== null && (
                            <RatingBadge value={review.rating} />
                        )}
                    </Link>
                ))
            )}
            {(data?.meta.total ?? 0) - 1 > SHOWN && (
                <Link
                    to={profilePath(username, "reviews")}
                    className="mx-1.5 mt-1 mb-1 self-start text-body-sm font-medium text-brand-text hover:underline"
                >
                    All their reviews
                </Link>
            )}
        </AsideCard>
    );
};

export default MoreFromAuthor;
