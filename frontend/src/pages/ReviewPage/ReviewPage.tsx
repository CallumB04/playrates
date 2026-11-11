import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Flag } from "lucide-react";
import { reviewTrail } from "@playrates/shared";
import { fetchReview, isNotFound, queryKeys } from "../../api";
import GameCover from "../../components/game/GameCover";
import { usePlayedOn } from "../../components/gamelog/usePlayedOn";
import ProfilePicture, {
    PrivateProfilePicture,
} from "../../components/ProfilePicture";
import ReportDialog from "../../components/ReportDialog";
import Breadcrumbs from "../../components/ui/Breadcrumbs";
import Button from "../../components/ui/Button";
import { cardClass } from "../../components/ui/cardClass";
import EmptyPlate from "../../components/ui/EmptyPlate";
import RatingBadge from "../../components/ui/RatingBadge";
import ReactionBar from "../../components/ui/ReactionBar";
import { Skeleton, TextSkeleton } from "../../components/ui/Skeleton";
import SpoilerCover from "../../components/ui/SpoilerCover";
import StatusBadge from "../../components/ui/StatusBadge";
import { useAuth } from "../../contexts/AuthContext";
import { useReviewVote } from "../../hooks/queries/useReviews";
import { usePageMeta } from "../../hooks/usePageMeta";
import { formatHours, relativeTime } from "../../lib/format";
import { profilePath } from "../../lib/profilePaths";
import { reviewStatus } from "../../lib/reviewStatus";
import { whyCannotVote } from "../../lib/voting";
import NotFoundPage from "../NotFoundPage";
import AboutGame from "./components/AboutGame";
import MoreFromAuthor from "./components/MoreFromAuthor";
import MoreOfGame from "./components/MoreOfGame";
import { cn } from "../../lib/cn";
import PageBackdrop, {
    TALL_BACKDROP_OFFSET,
} from "../../components/layout/PageBackdrop";

/* One column that may shrink, as on Community: left to size itself, a long
   unbroken word in a review would push the page past a phone's width. */
const COLUMNS =
    "grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8";

/** One review on a page of its own, so it can be linked to and found. */
const ReviewPage = () => {
    const id = Number(useParams().reviewId);
    const { user } = useAuth();
    const vote = useReviewVote();
    const playedOn = usePlayedOn();
    const [reporting, setReporting] = useState(false);
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
            <div className="flex flex-col gap-6">
                <div className="flex items-center gap-4 sm:gap-6">
                    <Skeleton className="aspect-3/4 w-20 rounded-xs sm:w-28" />
                    <div className="flex-1">
                        <TextSkeleton lines={2} />
                    </div>
                </div>
                <div className={COLUMNS}>
                    <div className={cardClass()}>
                        <TextSkeleton lines={8} />
                    </div>
                    <Skeleton className="h-48 rounded-lg" />
                </div>
            </div>
        );
    }

    const status = reviewStatus(review);
    const { name: platformName, Icon: PlatformIcon } = playedOn(review);
    const canReport = !!user && user.id !== author?.id;

    return (
        <div
            className={cn(
                "flex flex-col gap-6",
                review.game.artworkUrl && TALL_BACKDROP_OFFSET
            )}
        >
            {/* The game's own picture behind the page, as on the game's. */}
            <PageBackdrop url={review.game.artworkUrl ?? null} />
            <header className="flex flex-col gap-4 on-backdrop">
                <Breadcrumbs
                    trail={reviewTrail({
                        id: review.id,
                        game: review.game,
                        author: author?.username ?? null,
                    })}
                />
                <div className="flex items-center gap-4 sm:gap-6">
                    <Link
                        to={`/game/${review.game.id}`}
                        className="shrink-0 rounded-xs lift"
                    >
                        <GameCover
                            coverUrl={review.game.coverUrl}
                            title={review.game.title}
                            priority
                            className="aspect-3/4 w-20 overflow-hidden rounded-xs shadow-cover sm:w-28"
                        />
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <span className="text-label text-content-muted">
                            A review of
                        </span>
                        <h1 className="font-display text-[24px] leading-tight text-content sm:text-title">
                            <Link
                                to={`/game/${review.game.id}`}
                                className="hover:underline"
                            >
                                {review.game.title}
                            </Link>
                        </h1>
                        {author ? (
                            <Link
                                to={profilePath(author.username)}
                                className="flex min-w-0 items-center gap-2 self-start text-body-sm hover:underline"
                            >
                                <ProfilePicture
                                    variant="nav"
                                    file={author.avatarUrl ?? ""}
                                    accent={author.accent}
                                    username={author.username}
                                    link={false}
                                />
                                <span className="truncate font-medium text-content">
                                    {author.username}
                                </span>
                            </Link>
                        ) : (
                            <span className="flex items-center gap-2 text-body-sm text-content-secondary">
                                <PrivateProfilePicture variant="nav" />
                                Private account
                            </span>
                        )}
                    </div>
                    {review.rating !== null && (
                        <RatingBadge
                            value={review.rating}
                            size="lg"
                            className="hidden shrink-0 self-center sm:inline"
                        />
                    )}
                </div>
            </header>

            <div className={COLUMNS}>
                <div className="flex min-w-0 flex-col gap-8">
                    <article className={cardClass("flex flex-col gap-5")}>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-label-sm text-content-muted">
                            {review.rating !== null && (
                                <RatingBadge
                                    value={review.rating}
                                    size="row"
                                    className="sm:hidden"
                                />
                            )}
                            {status && <StatusBadge status={status} />}
                            {/* Which console the take is about: a port can be
                                a different game. */}
                            {platformName && (
                                <span className="inline-flex items-center gap-1.5 text-content-secondary">
                                    <PlatformIcon size={13} aria-hidden />
                                    {platformName}
                                </span>
                            )}
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
                        </div>

                        <SpoilerCover
                            covered={review.containsSpoilers}
                            revealLabel="Show review"
                        >
                            <p className="max-w-[68ch] text-body leading-relaxed wrap-break-word whitespace-pre-line text-content sm:text-[17px]">
                                {review.body}
                            </p>
                        </SpoilerCover>

                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-subtle pt-4">
                            <ReactionBar
                                voteCount={review.voteCount}
                                myReaction={review.myReaction}
                                reactions={review.reactions}
                                disabledReason={whyCannotVote(
                                    user?.id,
                                    author?.id
                                )}
                                onReact={(reaction) =>
                                    vote.mutateAsync({
                                        reviewId: review.id,
                                        reaction,
                                    })
                                }
                            />
                            {canReport && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setReporting(true)}
                                    className="min-h-11 px-2.5 text-content-muted sm:min-h-8"
                                >
                                    <Flag size={13} aria-hidden />
                                    Report
                                </Button>
                            )}
                        </div>
                    </article>

                    <MoreOfGame game={review.game} reviewId={review.id} />
                </div>

                <aside className="flex flex-col gap-4">
                    <AboutGame game={review.game} />
                    {author && (
                        <MoreFromAuthor
                            username={author.username}
                            reviewId={review.id}
                        />
                    )}
                </aside>
            </div>

            {reporting && (
                <ReportDialog
                    targetType="review"
                    targetId={review.id}
                    onClose={() => setReporting(false)}
                />
            )}
        </div>
    );
};

export default ReviewPage;
