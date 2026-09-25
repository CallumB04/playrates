import { Link } from "react-router-dom";
import type { TrendingThread } from "@playrates/shared";
import GameCover from "../game/GameCover";
import { formatMessageCount } from "../../lib/format";
import { cn } from "../../lib/cn";
import ContributorStack from "./ContributorStack";
import { threadPath } from "./paths";

/** The top few threads by messages this fortnight, ranked. */
const TrendingList = ({
    threads,
    className,
}: {
    threads: TrendingThread[];
    className?: string;
}) => (
    <ol className={cn("grid gap-3 md:grid-cols-3", className)}>
        {threads.map((thread) => {
            const game =
                thread.subject.kind === "game" ? thread.subject.game : null;
            return (
                <li key={thread.id} className="min-w-0">
                    <Link
                        to={threadPath(thread.id)}
                        className={cn(
                            "group flex h-full gap-3 rounded-lg border border-subtle bg-surface-raised p-3 shadow-plate lift",
                            "hover:-translate-y-px hover:shadow-lifted",
                            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                        )}
                    >
                        <span
                            aria-label={`Number ${thread.rank}`}
                            className={cn(
                                "font-display text-figure-lg leading-none",
                                thread.rank === 1
                                    ? "text-brand"
                                    : "text-content-muted"
                            )}
                        >
                            {thread.rank}
                        </span>
                        {game && (
                            <GameCover
                                coverUrl={game.coverUrl}
                                title={game.title}
                                className="aspect-3/4 w-11 shrink-0 self-start overflow-hidden rounded-xs shadow-cover"
                            />
                        )}
                        <span className="flex min-w-0 flex-1 flex-col gap-1">
                            {game && (
                                <span className="truncate text-label-sm text-content-muted">
                                    {game.title}
                                </span>
                            )}
                            <span className="line-clamp-2 text-body-sm font-semibold text-content group-hover:text-brand">
                                {thread.title}
                            </span>
                            <span className="mt-auto flex items-center justify-between gap-2 pt-1">
                                <span className="text-label-sm text-content-muted">
                                    <span className="font-mono text-content">
                                        {formatMessageCount(
                                            thread.recentMessageCount
                                        )}
                                    </span>{" "}
                                    new{" "}
                                    {thread.recentMessageCount === 1
                                        ? "message"
                                        : "messages"}
                                </span>
                                <ContributorStack
                                    contributors={thread.contributors.slice(
                                        0,
                                        3
                                    )}
                                    total={thread.contributorCount}
                                />
                            </span>
                        </span>
                    </Link>
                </li>
            );
        })}
    </ol>
);

export default TrendingList;
