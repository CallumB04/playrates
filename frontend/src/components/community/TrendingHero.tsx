import { Link } from "react-router-dom";
import { Flame } from "lucide-react";
import { TRENDING_WINDOW_DAYS, type TrendingThread } from "@playrates/shared";
import { cardClass } from "../ui/cardClass";
import GameCover from "../game/GameCover";
import { formatMessageCount } from "../../lib/format";
import { cn } from "../../lib/cn";
import ActivitySparkline from "./ActivitySparkline";
import ArtBackdrop from "../game/ArtBackdrop";
import ContributorStack from "./ContributorStack";
import { PeopleCount } from "./ThreadStats";
import { threadPath } from "./paths";

/** The busiest thread of the fortnight on its game's own art, with the
 *  fortnight drawn on a frosted panel the art shows through. */
const TrendingHero = ({ thread }: { thread: TrendingThread }) => {
    const game = thread.subject.kind === "game" ? thread.subject.game : null;

    return (
        <Link
            to={threadPath(thread.id)}
            className={cardClass(
                cn(
                    "group relative isolate block overflow-hidden lift hover:-translate-y-px hover:shadow-lifted",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                ),
                { padding: "none" }
            )}
        >
            <ArtBackdrop url={game?.artworkUrl} />

            <span className="relative flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-5">
                <span className="flex min-w-0 flex-1 items-start gap-4 sm:gap-5">
                    {game && (
                        <GameCover
                            coverUrl={game.coverUrl}
                            title={game.title}
                            className="aspect-3/4 w-16 shrink-0 overflow-hidden rounded-sm shadow-cover sm:w-22"
                        />
                    )}
                    <span className="flex min-w-0 flex-col gap-1">
                        <span className="inline-flex items-center gap-1.5 text-label-sm text-content-muted">
                            <Flame
                                size={13}
                                aria-hidden
                                className="text-brand-text"
                            />
                            <span className="font-mono font-semibold text-brand-text">
                                #1
                            </span>
                            Trending
                        </span>
                        {game && (
                            <span className="truncate text-label-sm text-content-secondary">
                                {game.title}
                            </span>
                        )}
                        <span className="mt-0.5 line-clamp-3 font-display text-xl leading-tight text-content group-hover:text-brand-text sm:text-2xl">
                            {thread.title}
                        </span>
                        <span className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-label-sm text-content-secondary">
                            <ContributorStack
                                contributors={thread.contributors}
                                total={thread.contributorCount}
                            />
                            <PeopleCount count={thread.contributorCount} />
                        </span>
                    </span>
                </span>

                <span className="flex shrink-0 flex-col gap-2 rounded-md border border-subtle bg-surface-raised/80 p-3 backdrop-blur-sm sm:w-56">
                    <span className="flex items-baseline gap-1.5">
                        <span className="font-display text-figure-lg text-content">
                            {formatMessageCount(thread.recentMessageCount)}
                        </span>
                        <span className="text-label-sm text-content-muted">
                            messages in {TRENDING_WINDOW_DAYS} days
                        </span>
                    </span>
                    <ActivitySparkline
                        activity={thread.activity}
                        className="h-10"
                    />
                    <span className="flex justify-between font-mono text-stamp text-content-muted">
                        <span>{TRENDING_WINDOW_DAYS} days ago</span>
                        <span>today</span>
                    </span>
                </span>
            </span>
        </Link>
    );
};

export default TrendingHero;
