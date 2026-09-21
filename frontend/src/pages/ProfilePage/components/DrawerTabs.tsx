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
    /** Sits at the right end of the rule, e.g. "14 games in common". */
    trailing?: ReactNode;
}

const ACCENT_BORDER: Record<GameStatus, string> = {
    played: "border-t-status-played",
    playing: "border-t-status-playing",
    backlog: "border-t-status-backlog",
    wishlist: "border-t-status-wishlist",
};

/**
 * Shelf tabs. The open one lifts and lights; the rest sit flat. That is how
 * you read which is open before the colour registers — and each pages
 * independently, so three hundred games stay navigable.
 */
const DrawerTabs = ({ active, counts, onSelect, trailing }: DrawerTabsProps) => (
    <div
        role="tablist"
        aria-label="Shelf sections"
        className="flex items-end gap-1.5 overflow-x-auto"
    >
        {GAME_STATUSES.map((status) => {
            const { label, icon: Mark, markTone } = STATUS_PRESENTATION[status];
            const isActive = status === active;

            return (
                <button
                    key={status}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => onSelect(status)}
                    className={cn(
                        "lift flex shrink-0 items-center gap-2 rounded-t-md border border-b-0 border-subtle border-t-[3px] px-4 pb-2.5 pt-2.5 text-label",
                        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
                        ACCENT_BORDER[status],
                        isActive
                            ? "bg-surface-raised text-content shadow-e1"
                            : "bg-transparent text-content-muted hover:text-content"
                    )}
                >
                    <Mark size={14} aria-hidden className={cn("shrink-0", isActive && markTone)} />
                    {label}
                    <span className="opacity-65">
                        {formatCount(counts[status] ?? 0)}
                    </span>
                </button>
            );
        })}

        <span aria-hidden className="h-px flex-1 bg-subtle" />
        {trailing && <div className="shrink-0 pb-2">{trailing}</div>}
    </div>
);

export default DrawerTabs;
