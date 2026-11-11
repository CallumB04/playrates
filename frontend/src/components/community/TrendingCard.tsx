import { Link } from "react-router-dom";
import { TrendingUp } from "lucide-react";
import type { TrendingThread } from "@playrates/shared";
import GameCover from "../game/GameCover";
import { cn } from "../../lib/cn";
import ActivitySparkline from "./ActivitySparkline";
import ArtBackdrop from "./ArtBackdrop";
import { NewMessageCount, PeopleCount } from "./ThreadStats";
import { threadPath } from "./paths";

/* #2 and #3 each get a colour of their own, and neither is the brand's:
   that stays with #1, so the leader is still the one that stands out. */
const TONES = {
    info: {
        border: "hover:border-info/60",
        rank: "text-info",
        title: "group-hover:text-info",
    },
    success: {
        border: "hover:border-success/60",
        rank: "text-success",
        title: "group-hover:text-success",
    },
} as const;

interface TrendingRunnerUpProps {
    thread: TrendingThread;
    tone: keyof typeof TONES;
}

/** A smaller card for the threads just behind the leader, on its game's
 *  art as the leader is. */
const TrendingRunnerUp = ({ thread, tone }: TrendingRunnerUpProps) => {
    const game = thread.subject.kind === "game" ? thread.subject.game : null;
    const colours = TONES[tone];

    return (
        <Link
            to={threadPath(thread.id)}
            className={cn(
                "group relative flex min-w-0 overflow-hidden rounded-lg border border-subtle bg-surface-raised shadow-plate lift",
                "hover:-translate-y-px hover:shadow-lifted",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                colours.border
            )}
        >
            <ArtBackdrop url={game?.artworkUrl} fade="down" />

            <span className="relative flex min-w-0 flex-1 gap-3.5 p-3.5">
                {game && (
                    <GameCover
                        sizes="48px"
                        coverUrl={game.coverUrl}
                        title={game.title}
                        className="aspect-3/4 w-12 shrink-0 self-start overflow-hidden rounded-xs shadow-cover"
                    />
                )}
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex min-w-0 items-center gap-1.5 text-label-sm text-content-muted">
                        <TrendingUp
                            size={12}
                            aria-hidden
                            className={cn("shrink-0", colours.rank)}
                        />
                        <span
                            className={cn(
                                "shrink-0 font-mono font-semibold",
                                colours.rank
                            )}
                        >
                            #{thread.rank}
                        </span>
                        {game && (
                            <span className="truncate text-content-secondary">
                                {game.title}
                            </span>
                        )}
                    </span>
                    <span
                        className={cn(
                            "line-clamp-2 text-body-sm font-semibold text-content",
                            colours.title
                        )}
                    >
                        {thread.title}
                    </span>
                    <span className="mt-auto flex items-end justify-between gap-3 pt-1.5">
                        <span className="flex shrink-0 flex-col gap-0.5 text-label-sm text-content-secondary">
                            <NewMessageCount
                                count={thread.recentMessageCount}
                            />
                            <PeopleCount count={thread.contributorCount} />
                        </span>
                        <ActivitySparkline
                            activity={thread.activity}
                            tone={tone}
                            className="h-7 w-24"
                        />
                    </span>
                </span>
            </span>
        </Link>
    );
};

export default TrendingRunnerUp;
