import { Link } from "react-router-dom";
import { MessageSquare, Users } from "lucide-react";
import type { ThreadCard as ThreadCardData } from "@playrates/shared";
import GameCover from "../game/GameCover";
import ContributorStack from "./ContributorStack";
import { formatCount, relativeTime } from "../../lib/format";
import { cn } from "../../lib/cn";
import { threadPath } from "./paths";

interface ThreadCardProps {
    thread: ThreadCardData;
    /** Leave the game off where the page is already about it. */
    showSubject?: boolean;
    className?: string;
}

/** One thread in a list: the whole row is the link. */
const ThreadCard = ({
    thread,
    showSubject = true,
    className,
}: ThreadCardProps) => {
    const game = thread.subject.kind === "game" ? thread.subject.game : null;

    return (
        <Link
            to={threadPath(thread.id)}
            className={cn(
                "group flex gap-3 rounded-md p-3 lift hover:bg-surface-hover sm:gap-4",
                "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
                className
            )}
        >
            {showSubject && game && (
                <GameCover
                    coverUrl={game.coverUrl}
                    title={game.title}
                    className="aspect-3/4 w-11 shrink-0 self-start overflow-hidden rounded-xs shadow-cover sm:w-12"
                />
            )}

            <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                {showSubject && game && (
                    <span className="truncate text-label-sm text-content-muted">
                        {game.title}
                    </span>
                )}
                <span className="line-clamp-2 font-display text-[1.0625rem] leading-snug font-semibold text-content group-hover:text-brand">
                    {thread.title}
                </span>

                <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-label-sm text-content-muted">
                    <span className="inline-flex items-center gap-1">
                        <MessageSquare size={13} aria-hidden />
                        <span className="font-mono tabular-nums">
                            {formatCount(thread.messageCount)}
                        </span>
                        {thread.messageCount === 1 ? "message" : "messages"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <Users size={13} aria-hidden />
                        <span className="font-mono tabular-nums">
                            {formatCount(thread.contributorCount)}
                        </span>
                        {thread.contributorCount === 1 ? "person" : "people"}
                    </span>
                    <span>active {relativeTime(thread.lastActivityAt)}</span>
                    <ContributorStack
                        contributors={thread.contributors}
                        total={thread.contributorCount}
                        className="sm:hidden"
                    />
                </span>
            </span>

            <ContributorStack
                contributors={thread.contributors}
                total={thread.contributorCount}
                className="hidden shrink-0 self-center sm:flex"
            />
        </Link>
    );
};

export default ThreadCard;
