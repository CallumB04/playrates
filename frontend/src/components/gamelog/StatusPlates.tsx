import {
    GAME_STATUSES,
    PLAYED_STATUSES,
    STATUS_PRESENTATION,
    type DisplayStatus,
    type GameStatus,
    type PlayedStatus,
} from "../../constants/gameStatus";
import { cn } from "../../lib/cn";

/* Selected fills with its own hue and lifts. Unselected stays quiet but has
   to read as live, not disabled. */
const TILE: Record<GameStatus, { on: string; ring: string }> = {
    played: {
        on: "border-status-played bg-status-played-quiet text-content",
        ring: "focus-visible:outline-status-played",
    },
    playing: {
        on: "border-status-playing bg-status-playing-quiet text-content",
        ring: "focus-visible:outline-status-playing",
    },
    backlog: {
        on: "border-status-backlog bg-status-backlog-quiet text-content",
        ring: "focus-visible:outline-status-backlog",
    },
    wishlist: {
        on: "border-status-wishlist bg-status-wishlist-quiet text-content",
        ring: "focus-visible:outline-status-wishlist",
    },
};

const RESTING =
    "border-subtle bg-surface-raised text-content-secondary hover:border-strong hover:text-content";

const BASE =
    "lift group relative flex items-center gap-2.5 rounded-md border px-3 py-2.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2";

/** The disc behind the icon. Filled when chosen, so the row has a focal point. */
const Disc = ({
    status,
    selected,
    size = 30,
}: {
    status: DisplayStatus;
    selected: boolean;
    size?: number;
}) => {
    const { icon: Icon, markTone, accent } = STATUS_PRESENTATION[status];
    return (
        <span
            style={{ width: size, height: size }}
            className={cn(
                "grid place-items-center rounded-full transition-colors duration-200",
                selected
                    ? cn(accent, "text-white shadow-glow")
                    : "bg-surface-sunken text-content-muted group-hover:bg-surface-hover",
                !selected && markTone
            )}
        >
            <Icon size={size * 0.45} strokeWidth={2.2} aria-hidden />
        </span>
    );
};

export const StatusPlates = ({
    value,
    onChange,
}: {
    value: GameStatus;
    onChange: (status: GameStatus) => void;
}) => (
    <fieldset>
        <legend className="mb-2.5 text-label text-content-muted">Status</legend>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {GAME_STATUSES.map((status) => {
                const { label } = STATUS_PRESENTATION[status];
                const selected = status === value;

                return (
                    <button
                        key={status}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => onChange(status)}
                        className={cn(
                            BASE,
                            TILE[status].ring,
                            selected
                                ? cn(TILE[status].on, "shadow-plate")
                                : RESTING
                        )}
                    >
                        <Disc status={status} selected={selected} />
                        <span className="min-w-0 truncate text-body-sm font-medium">
                            {label}
                        </span>
                    </button>
                );
            })}
        </div>
    </fieldset>
);

const PlayedTile = ({
    label,
    mark,
    selected,
    onClick,
    className,
}: {
    label: string;
    /** Which presentation lends its icon and hue. */
    mark: DisplayStatus;
    selected: boolean;
    onClick: () => void;
    className?: string;
}) => (
    <button
        type="button"
        aria-pressed={selected}
        onClick={onClick}
        className={cn(
            BASE,
            "focus-visible:outline-brand",
            selected
                ? "border-brand bg-brand-subtle text-content shadow-plate"
                : RESTING,
            className
        )}
    >
        <Disc status={mark} selected={selected} />
        <span className="min-w-0 truncate text-body-sm font-medium">
            {label}
        </span>
    </button>
);

export const PlayedStatusPlates = ({
    value,
    onChange,
}: {
    value: PlayedStatus | null;
    onChange: (status: PlayedStatus | null) => void;
}) => (
    <fieldset>
        <legend className="mb-2.5 flex items-baseline gap-2.5">
            <span className="text-label text-content-muted">How it ended</span>
        </legend>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {/* Stands for no substatus at all, and stays null in the database.
                Without something already selected the row read as four
                unanswered questions rather than an optional refinement. */}
            <PlayedTile
                label="Just played"
                mark="played"
                selected={value === null}
                onClick={() => onChange(null)}
                // Its own row: five across clipped every label below 900px.
                className="col-span-2 sm:col-span-4"
            />
            {PLAYED_STATUSES.map((status) => {
                const { label } = STATUS_PRESENTATION[status];
                const selected = status === value;

                return (
                    <PlayedTile
                        key={status}
                        label={label}
                        mark={status}
                        selected={selected}
                        // Pressing the selected tile falls back to just played.
                        onClick={() => onChange(selected ? null : status)}
                    />
                );
            })}
        </div>
    </fieldset>
);
