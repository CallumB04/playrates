import { Link } from "react-router-dom";
import { Flame } from "lucide-react";
import { TRENDING_WINDOW_DAYS, type TrendingThread } from "@playrates/shared";
import { cardClass } from "../ui/Card";
import GameCover from "../game/GameCover";
import { formatMessageCount } from "../../lib/format";
import { cn } from "../../lib/cn";
import ActivitySparkline from "./ActivitySparkline";
import ContributorStack from "./ContributorStack";
import { threadPath } from "./paths";

/** The busiest thread of the fortnight, with the fortnight drawn. */
const TrendingHero = ({ thread }: { thread: TrendingThread }) => {
    const game = thread.subject.kind === "game" ? thread.subject.game : null;

    return (
        <Link
            to={threadPath(thread.id)}
            className={cardClass(
                cn(
                    "group relative block overflow-hidden lift hover:-translate-y-px hover:shadow-lifted",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                ),
                { tone: "accent", padding: "none" }
            )}
        >
            <span
                aria-hidden
                className="pointer-events-none absolute -top-24 -right-20 size-72 rounded-full bg-brand/10 blur-3xl"
            />

            <span className="relative flex flex-col gap-5 p-4 sm:flex-row sm:items-stretch sm:gap-6 sm:p-6">
                <span className="flex min-w-0 flex-1 gap-4">
                    {game && (
                        <GameCover
                            coverUrl={game.coverUrl}
                            title={game.title}
                            className="aspect-3/4 w-16 shrink-0 self-start overflow-hidden rounded-sm shadow-cover sm:w-20"
                        />
                    )}
                    <span className="flex min-w-0 flex-col gap-2">
                        <span className="inline-flex w-max items-center gap-1.5 rounded-full bg-brand px-2.5 py-1 text-label-sm font-semibold text-content-on-solid">
                            <Flame size={13} aria-hidden />
                            #1 Trending
                        </span>
                        {game && (
                            <span className="truncate text-label text-content-muted">
                                {game.title}
                            </span>
                        )}
                        <span className="line-clamp-3 font-display text-section text-content group-hover:text-brand">
                            {thread.title}
                        </span>
                        <ContributorStack
                            contributors={thread.contributors}
                            total={thread.contributorCount}
                        />
                    </span>
                </span>

                <span className="flex shrink-0 flex-col justify-end gap-2 border-t border-brand/15 pt-4 sm:w-56 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6">
                    <span className="flex items-baseline gap-1.5">
                        <span className="font-display text-figure-lg text-content">
                            {formatMessageCount(thread.recentMessageCount)}
                        </span>
                        <span className="text-label-sm text-content-muted">
                            messages in {TRENDING_WINDOW_DAYS} days
                        </span>
                    </span>
                    <ActivitySparkline activity={thread.activity} />
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
