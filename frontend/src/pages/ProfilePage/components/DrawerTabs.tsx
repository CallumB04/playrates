import type { ReactNode } from "react";
import {
    GAME_STATUSES,
    STATUS_PRESENTATION,
    type GameStatus,
} from "../../../constants/gameStatus";
import { formatCount } from "../../../lib/format";
import { cn } from "../../../lib/cn";

interface DrawerTabsProps {
    active: GameStatus;
    counts: Partial<Record<GameStatus, number>>;
    onSelect: (status: GameStatus) => void;
    /** Sits to the right of the control, e.g. "14 games in common". */
    trailing?: ReactNode;
}

/**
 * A segmented control.
 *
 * These were four separate folder tabs with gaps between them, sitting on a
 * rule that ran off to the right — four objects pretending to be one control.
 * One track with four segments reads as a single choice, which is what it is.
 */
const DrawerTabs = ({ active, counts, onSelect, trailing }: DrawerTabsProps) => (
    <div className="flex flex-wrap items-center justify-between gap-3">
        <div
            role="tablist"
            aria-label="Shelf sections"
            className="inline-flex max-w-full gap-1 overflow-x-auto rounded-md border border-subtle bg-surface-sunken p-1"
        >
            {GAME_STATUSES.map((status) => {
                const { label, icon: Icon, markTone } =
                    STATUS_PRESENTATION[status];
                const isActive = status === active;

                return (
                    <button
                        key={status}
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => onSelect(status)}
                        className={cn(
                            "lift flex shrink-0 cursor-pointer items-center gap-2 rounded-sm px-3.5 py-2 text-body-sm",
                            "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
                            isActive
                                ? "bg-surface-raised font-medium text-content shadow-lip"
                                : "text-content-secondary hover:text-content"
                        )}
                    >
                        <Icon
                            size={14}
                            aria-hidden
                            className={cn("shrink-0", isActive && markTone)}
                        />
                        {label}
                        <span
                            className={cn(
                                "rounded-full px-1.5 font-mono text-label-sm tabular-nums",
                                isActive
                                    ? "bg-surface-sunken text-content-secondary"
                                    : "text-content-muted"
                            )}
                        >
                            {formatCount(counts[status] ?? 0)}
                        </span>
                    </button>
                );
            })}
        </div>

        {trailing}
    </div>
);

export default DrawerTabs;
