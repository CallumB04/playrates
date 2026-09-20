import type { ReactNode } from "react";
import {
    GAME_STATUSES,
    STATUS_PRESENTATION,
    type GameStatus,
} from "../../../constants/gameStatus";
import { STATUS_MARKS } from "../../../lib/marks";
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
 * Index-drawer tabs. The active one rises out of the deboss; the rest stay
 * pressed in. That is how you read which drawer is open before the colour
 * registers — and each tab pages independently.
 */
const DrawerTabs = ({ active, counts, onSelect, trailing }: DrawerTabsProps) => (
    <div
        role="tablist"
        aria-label="Shelf sections"
        className="flex items-end gap-1.5 overflow-x-auto"
    >
        {GAME_STATUSES.map((status) => {
            const { label, mark, markTone } = STATUS_PRESENTATION[status];
            const Mark = STATUS_MARKS[mark];
            const isActive = status === active;

            return (
                <button
                    key={status}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => onSelect(status)}
                    className={cn(
                        "plate-press flex shrink-0 items-center gap-2 border border-b-0 border-strong border-t-[3px] px-4 pb-2 pt-2.5 font-mono text-[10.5px] uppercase tracking-[.14em]",
                        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
                        ACCENT_BORDER[status],
                        isActive
                            ? "animate-tab-raise bg-surface-raised text-content"
                            : "bg-surface-sunken text-content-muted inset-shadow-deep"
                    )}
                >
                    <Mark className={cn("text-[10px]", isActive && markTone)} />
                    {label}
                    <span className="opacity-65">
                        {formatCount(counts[status] ?? 0)}
                    </span>
                </button>
            );
        })}

        <span aria-hidden className="h-px flex-1 bg-strong" />
        {trailing && <div className="shrink-0 pb-2">{trailing}</div>}
    </div>
);

export default DrawerTabs;
