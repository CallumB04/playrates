import { Link } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import type { LatestReply, TalkedAboutGame } from "@playrates/shared";
import { cardClass } from "../ui/Card";
import GameCover from "../game/GameCover";
import ProfilePicture from "../ProfilePicture";
import { formatMessageCount, relativeTime } from "../../lib/format";
import { cn } from "../../lib/cn";
import { threadPath } from "./paths";

const HEADING = "px-3 pt-3 pb-1.5 text-label text-content-muted";
const ROW =
    "flex gap-2.5 rounded-sm px-3 py-2 lift hover:bg-surface-hover " +
    "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand";

/**
 * What the community is doing right now: the games it is talking about and
 * the newest replies. One plain card for both, so the patch notes above
 * stay the only thing in the column with colour.
 */
const CommunityPulse = ({
    games,
    replies,
    className,
}: {
    games: TalkedAboutGame[];
    replies: LatestReply[];
    className?: string;
}) => {
    if (games.length === 0 && replies.length === 0) return null;

    return (
        <section
            aria-label="Around the community"
            className={cardClass(cn("flex flex-col pb-1.5", className), {
                padding: "none",
            })}
        >
            {games.length > 0 && (
                <div>
                    <h2 className={HEADING}>Most discussed games</h2>
                    <ul>
                        {games.map(({ game, recentMessageCount }, i) => (
                            <li key={game.id}>
                                <Link
                                    to={`/community?game=${game.id}`}
                                    className={cn(ROW, "items-center")}
                                >
                                    <span
                                        aria-label={`Number ${i + 1}`}
                                        className={cn(
                                            "w-5 shrink-0 font-mono text-label-sm tabular-nums",
                                            i === 0
                                                ? "font-semibold text-brand"
                                                : "text-content-muted"
                                        )}
                                    >
                                        #{i + 1}
                                    </span>
                                    <GameCover
                                        coverUrl={game.coverUrl}
                                        title={game.title}
                                        className="aspect-3/4 w-7 shrink-0 overflow-hidden rounded-xs"
                                    />
                                    <span className="min-w-0 flex-1 truncate text-body-sm font-medium text-content">
                                        {game.title}
                                    </span>
                                    <span
                                        className="inline-flex shrink-0 items-center gap-1 font-mono text-label-sm text-content-muted"
                                        aria-label={`${formatMessageCount(recentMessageCount)} messages lately`}
                                    >
                                        <MessageSquare size={12} aria-hidden />
                                        {formatMessageCount(recentMessageCount)}
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {games.length > 0 && replies.length > 0 && (
                <hr className="mx-3 my-1.5 border-subtle" />
            )}

            {replies.length > 0 && (
                <div>
                    <h2 className={HEADING}>Latest replies</h2>
                    <ul>
                        {replies.map((reply) => (
                            <li key={reply.id}>
                                <Link
                                    to={`${threadPath(reply.threadId)}#message-${reply.id}`}
                                    className={ROW}
                                >
                                    <span className="shrink-0 [&>*]:size-7">
                                        <ProfilePicture
                                            variant="nav"
                                            file={reply.author?.avatarUrl ?? ""}
                                            username={
                                                reply.author?.username ?? "?"
                                            }
                                            accent={reply.author?.accent}
                                            link={false}
                                        />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="flex items-baseline gap-1.5 text-label-sm">
                                            <span className="truncate font-semibold text-content">
                                                {reply.author?.username ??
                                                    "Deleted account"}
                                            </span>
                                            <span className="shrink-0 text-content-muted">
                                                {relativeTime(reply.createdAt)}
                                            </span>
                                        </span>
                                        <span className="mt-0.5 line-clamp-2 text-label-sm text-content-secondary">
                                            {reply.excerpt}
                                        </span>
                                        <span className="mt-0.5 block truncate text-stamp text-content-muted">
                                            in {reply.threadTitle}
                                        </span>
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
};

export default CommunityPulse;
