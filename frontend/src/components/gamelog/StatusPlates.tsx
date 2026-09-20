import {
    GAME_STATUSES,
    PLAYED_STATUSES,
    STATUS_PRESENTATION,
    statusRadius,
    type GameStatus,
    type PlayedStatus,
} from "../../constants/gameStatus";
import { STATUS_MARKS } from "../../lib/marks";
import { cn } from "../../lib/cn";

const ACCENT_BORDER: Record<GameStatus, string> = {
    played: "border-t-status-played",
    playing: "border-t-status-playing",
    backlog: "border-t-status-backlog",
    wishlist: "border-t-status-wishlist",
};

/* Selected rises and gathers light; unselected simply hasn't risen. The
   shadow carries the state, so it survives the colour being removed. */
const RESTING = "bg-surface-sunken text-content-muted border-subtle";
const SELECTED = "bg-surface-raised text-content border-strong shadow-plate";

export const StatusPlates = ({
    value,
    onChange,
}: {
    value: GameStatus;
    onChange: (status: GameStatus) => void;
}) => (
    <fieldset>
        <legend className="mb-2.5 font-mono text-label uppercase text-content-muted">
            Status
        </legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {GAME_STATUSES.map((status) => {
                const { label, mark, markTone } = STATUS_PRESENTATION[status];
                const Mark = STATUS_MARKS[mark];
                const selected = status === value;

                return (
                    <button
                        key={status}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => onChange(status)}
                        className={cn(
                            "lift flex min-h-12 items-center justify-center gap-2 rounded-sm border border-t-[3px] px-3 text-body-sm font-medium",
                            "hover:-translate-y-px focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
                            ACCENT_BORDER[status],
                            selected ? SELECTED : RESTING
                        )}
                    >
                        <Mark className={cn("text-xs", selected && markTone)} />
                        {label}
                    </button>
                );
            })}
        </div>
    </fieldset>
);

const SUB_COPY: Record<PlayedStatus, string> = {
    finished: "Saw the credits",
    mastered: "Every achievement",
    shelved: "Might come back",
    retired: "Done with it",
};

export const PlayedStatusPlates = ({
    value,
    onChange,
}: {
    value: PlayedStatus | null;
    onChange: (status: PlayedStatus | null) => void;
}) => (
    <fieldset>
        <legend className="mb-2.5 flex items-baseline gap-2.5">
            <span className="font-mono text-label uppercase text-content-muted">
                How it ended
            </span>
            <span className="text-xs text-content-muted">
                shown only when played
            </span>
        </legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PLAYED_STATUSES.map((status) => {
                const { label } = STATUS_PRESENTATION[status];
                const selected = status === value;

                return (
                    <button
                        key={status}
                        type="button"
                        aria-pressed={selected}
                        // Pressing the selected plate clears it.
                        onClick={() => onChange(selected ? null : status)}
                        className={cn(
                            "lift flex min-h-12 flex-col gap-1 rounded-sm border px-3 py-2.5 text-left",
                            "hover:-translate-y-px focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
                            selected
                                ? "border-brand bg-brand-subtle text-content shadow-plate"
                                : RESTING
                        )}
                    >
                        <span className="flex items-center gap-2">
                            {/* The shape is the channel — a pill for mastered,
                                a cut corner for shelved, and so on. */}
                            <span
                                aria-hidden
                                className={cn(
                                    "size-2.5 border-[1.5px]",
                                    statusRadius(status),
                                    selected
                                        ? "border-brand bg-brand"
                                        : "border-content-muted"
                                )}
                            />
                            <span className="text-body-sm font-medium">
                                {label}
                            </span>
                        </span>
                        <span className="text-[11px] leading-snug text-content-muted">
                            {SUB_COPY[status]}
                        </span>
                    </button>
                );
            })}
        </div>
    </fieldset>
);
