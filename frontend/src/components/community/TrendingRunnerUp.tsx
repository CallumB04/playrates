import { Link } from "react-router-dom";
import { TrendingUp } from "lucide-react";
import type { TrendingThread } from "@playrates/shared";
import GameCover from "../game/GameCover";
import { cn } from "../../lib/cn";
import ActivitySparkline from "./ActivitySparkline";
import { NewMessageCount, PeopleCount } from "./ThreadStats";
import { threadPath } from "./paths";

/* #2 and #3 each get a colour of their own, and neither is the brand's:
   that stays with #1, so the leader is still the one that stands out. */
const TONES = {
    info: {
        border: "border-info/30 hover:border-info/60",
        badge: "bg-info text-content-on-solid",
        title: "group-hover:text-info",
    },
    success: {
        border: "border-success/30 hover:border-success/60",
        badge: "bg-success text-content-on-solid",
        title: "group-hover:text-success",
    },
} as const;

interface TrendingRunnerUpProps {
    thread: TrendingThread;
    tone: keyof typeof TONES;
}

/** A smaller card for the threads just behind the leader. */
const TrendingRunnerUp = ({ thread, tone }: TrendingRunnerUpProps) => {
    const game = thread.subject.kind === "game" ? thread.subject.game : null;
    const colours = TONES[tone];

    return (
        <Link
            to={threadPath(thread.id)}
            className={cn(
                "group flex min-w-0 gap-3 rounded-lg border bg-surface-raised p-3 shadow-plate lift",
                "hover:-translate-y-px hover:shadow-lifted",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                colours.border
            )}
        >
            {game && (
                <GameCover
                    coverUrl={game.coverUrl}
                    title={game.title}
                    className="aspect-3/4 w-11 shrink-0 self-start overflow-hidden rounded-xs shadow-cover"
                />
            )}
            <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex min-w-0 items-center gap-2">
                    <span
                        className={cn(
                            "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-stamp font-semibold",
                            colours.badge
                        )}
                    >
                        <TrendingUp size={11} aria-hidden />#{thread.rank}
                    </span>
                    {game && (
                        <span className="truncate text-label-sm text-content-muted">
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
                <span className="mt-auto flex items-end justify-between gap-3 pt-1">
                    <span className="flex shrink-0 flex-col gap-0.5 text-label-sm text-content-muted">
                        <NewMessageCount count={thread.recentMessageCount} />
                        <PeopleCount count={thread.contributorCount} />
                    </span>
                    <ActivitySparkline
                        activity={thread.activity}
                        tone={tone}
                        className="h-6 w-24"
                    />
                </span>
            </span>
        </Link>
    );
};

export default TrendingRunnerUp;
