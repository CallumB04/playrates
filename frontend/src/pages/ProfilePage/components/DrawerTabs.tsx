import type { ReactNode } from "react";
import {
    GAME_STATUSES,
    STATUS_PRESENTATION,
    type GameStatus,
} from "../../../constants/gameStatus";
import { formatCount } from "../../../lib/format";
import { useOverflowFade } from "../../../hooks/useOverflowFade";
import { cn } from "../../../lib/cn";

interface DrawerTabsProps {
    active: GameStatus;
    counts: Partial<Record<GameStatus, number>>;
    onSelect: (status: GameStatus) => void;
    /** Sits to the right of the control, e.g. "14 games in common". */
    trailing?: ReactNode;
}

/* The active segment gets the rim but no cast shadow. In a 4px gutter the
   shadow darkens the space below the pill, which makes the gap above look
   bigger than the one below even though they're equal. */
const DrawerTabs = ({
    active,
    counts,
    onSelect,
    trailing,
}: DrawerTabsProps) => {
    const fade = useOverflowFade<HTMLDivElement>();

    return (
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div
                role="tablist"
                aria-label="Shelf sections"
                ref={fade.ref}
                onScroll={fade.onScroll}
                style={fade.style}
                className="grid w-full grid-cols-4 gap-1 rounded-md border border-subtle bg-surface-sunken p-1 [contain:layout] sm:inline-flex sm:w-auto sm:max-w-full sm:overflow-x-auto"
            >
                {GAME_STATUSES.map((status) => {
                    const {
                        label,
                        icon: Icon,
                        markTone,
                    } = STATUS_PRESENTATION[status];
                    const isActive = status === active;

                    return (
                        <button
                            key={status}
                            role="tab"
                            aria-selected={isActive}
                            onClick={() => onSelect(status)}
                            className={cn(
                                // Four equal cells on a phone, so Backlog and
                                // Wishlist aren't scrolled out of sight.
                                "flex min-h-11 min-w-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-sm px-1 py-1.5 text-label-sm lift sm:min-h-0 sm:shrink-0 sm:flex-row sm:gap-2 sm:px-3.5 sm:py-2 sm:text-body-sm",
                                "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
                                isActive
                                    ? "bg-surface-raised font-medium text-content"
                                    : "text-content-secondary hover:text-content"
                            )}
                        >
                            <span className="flex items-center gap-1.5">
                                <Icon
                                    size={14}
                                    aria-hidden
                                    className={cn(
                                        "shrink-0",
                                        isActive && markTone
                                    )}
                                />
                                <span className="font-mono tabular-nums sm:hidden">
                                    {formatCount(counts[status] ?? 0)}
                                </span>
                            </span>
                            <span className="truncate">{label}</span>
                            <span
                                className={cn(
                                    "hidden rounded-full px-1.5 font-mono text-label-sm tabular-nums sm:inline",
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
};

export default DrawerTabs;
