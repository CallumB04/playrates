import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchReview, isNotFound, queryKeys } from "../../api";
import GameCover from "../../components/game/GameCover";
import ProfilePicture, {
    PrivateProfilePicture,
} from "../../components/ProfilePicture";
import { cardClass } from "../../components/ui/cardClass";
import EmptyPlate from "../../components/ui/EmptyPlate";
import RatingBadge from "../../components/ui/RatingBadge";
import { TextSkeleton } from "../../components/ui/Skeleton";
import SpoilerCover from "../../components/ui/SpoilerCover";
import { usePageMeta } from "../../hooks/usePageMeta";
import { formatHours, relativeTime } from "../../lib/format";
import { profilePath } from "../../lib/profilePaths";
import NotFoundPage from "../NotFoundPage";

/** One review on a page of its own, so it can be linked to and found. */
const ReviewPage = () => {
    const id = Number(useParams().reviewId);
    const {
        data: review,
        isPending,
        error,
    } = useQuery({
        queryKey: queryKeys.reviews.one(id),
        queryFn: () => fetchReview(id),
        enabled: Number.isInteger(id) && id > 0,
    });
    const author = review?.author ?? null;
    usePageMeta({
        title: review
            ? author
                ? `${author.username}’s review of ${review.game.title}`
                : `A review of ${review.game.title}`
            : null,
    });

    if (!Number.isInteger(id) || id <= 0 || isNotFound(error)) {
        return <NotFoundPage />;
    }
    if (error) {
        return (
            <EmptyPlate
                title="This review didn’t load"
                body="Try again in a moment."
            />
        );
    }
    if (isPending || !review) {
        return (
            <div className={cardClass("max-w-2xl")}>
                <TextSkeleton lines={6} />
            </div>
        );
    }

    return (
        <article className="flex max-w-2xl flex-col gap-6">
            <Link
                to={`/game/${review.game.id}`}
                className="flex items-center gap-4 rounded-md lift hover:bg-surface-hover"
            >
                <GameCover
                    coverUrl={review.game.coverUrl}
                    title={review.game.title}
                    className="aspect-3/4 w-16 shrink-0 rounded-xs sm:w-20"
                />
                <span className="min-w-0">
                    <span className="block text-label text-content-muted">
                        A review of
                    </span>
                    <span className="block font-display text-[24px] leading-tight text-content sm:text-[32px]">
                        {review.game.title}
                    </span>
                </span>
            </Link>

            <div className={cardClass("flex flex-col gap-4")}>
                <div className="flex items-center gap-3">
                    {author ? (
                        <Link
                            to={profilePath(author.username)}
                            className="flex min-w-0 flex-1 items-center gap-2.5 hover:underline"
                        >
                            <ProfilePicture
                                variant="friendRow"
                                file={author.avatarUrl ?? ""}
                                accent={author.accent}
                                username={author.username}
                                link={false}
                            />
                            <span className="truncate text-body font-medium text-content">
                                {author.username}
                            </span>
                        </Link>
                    ) : (
                        <span className="flex min-w-0 flex-1 items-center gap-2.5">
                            <PrivateProfilePicture variant="friendRow" />
                            <span className="text-body text-content-secondary">
                                Private account
                            </span>
                        </span>
                    )}
                    {review.rating !== null && (
                        <RatingBadge value={review.rating} size="row" />
                    )}
                </div>

                <SpoilerCover
                    covered={review.containsSpoilers}
                    revealLabel="Show review"
                >
                    <p className="text-body leading-relaxed whitespace-pre-line text-content">
                        {review.body}
                    </p>
                </SpoilerCover>

                <p className="flex flex-wrap gap-x-3 gap-y-1 text-label-sm text-content-muted">
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
                </p>
            </div>

            <Link
                to={`/game/${review.game.id}#review-${review.id}`}
                className="self-start text-body-sm font-medium text-brand-text hover:underline"
            >
                More reviews of {review.game.title}
            </Link>
        </article>
    );
};

export default ReviewPage;
