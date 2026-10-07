import type { ReactNode } from "react";
import type { GameLog } from "@playrates/shared";
import { ChevronRight } from "lucide-react";
import { displayStatusFor } from "../../constants/gameStatus";
import { formatHours } from "../../lib/format";
import { cn } from "../../lib/cn";
import StatusBadge from "../ui/StatusBadge";
import RatingBadge from "../ui/RatingBadge";
import { usePlayedOn } from "./usePlayedOn";

interface LogRowProps {
    log: GameLog;
    onSelect: () => void;
    /** Replaces the hours on the right, where the row is for something else:
     *  whether the review is written, say. */
    aside?: ReactNode;
    className?: string;
}

/**
 * One console's log as a single row: the whole row is the button, so on a
 * phone it is one easy target rather than a run of small ones.
 */
export const LogRow = ({ log, onSelect, aside, className }: LogRowProps) => {
    const playedOn = usePlayedOn()(log);
    const Icon = playedOn.Icon;

    return (
        <button
            type="button"
            onClick={onSelect}
            className={cn(
                "flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-sm px-3 py-2 text-left lift hover:bg-surface-hover",
                "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
                className
            )}
        >
            <Icon
                size={16}
                aria-hidden
                className="shrink-0 text-content-secondary"
            />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
                <span
                    className={cn(
                        "truncate text-body-sm font-medium",
                        playedOn.name ? "text-content" : "text-content-muted"
                    )}
                >
                    {playedOn.name ?? "Platform not set"}
                </span>
                <StatusBadge
                    status={displayStatusFor(log.status, log.playedStatus)}
                    plain
                    className="text-label-sm"
                />
            </span>
            <span className="flex shrink-0 items-center gap-3">
                {aside ?? (
                    <>
                        {log.hoursPlayed !== null && (
                            <span className="hidden font-mono text-label-sm text-content-muted sm:inline">
                                {formatHours(log.hoursPlayed)}
                            </span>
                        )}
                        <RatingBadge value={log.rating} />
                    </>
                )}
                <ChevronRight
                    size={15}
                    aria-hidden
                    className="text-content-muted"
                />
            </span>
        </button>
    );
};

export default LogRow;
