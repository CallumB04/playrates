import { Fragment } from "react";
import {
    GAME_STATUSES,
    PLAYED_STATUSES,
    STATUS_PRESENTATION,
    type DisplayStatus,
    type GameStatus,
    type PlayedStatus,
} from "../../constants/gameStatus";
import { cn } from "../../lib/cn";

/* Selected fills with its own hue and lifts; the fill itself is the status's
   chip. Only the focus ring lives here — complete class strings, because
   Tailwind emits what it finds literally. */
const RING: Record<DisplayStatus, string> = {
    played: "focus-visible:outline-status-played",
    playing: "focus-visible:outline-status-playing",
    backlog: "focus-visible:outline-status-backlog",
    wishlist: "focus-visible:outline-status-wishlist",
    finished: "focus-visible:outline-status-finished",
    mastered: "focus-visible:outline-status-mastered",
    shelved: "focus-visible:outline-status-shelved",
    retired: "focus-visible:outline-status-retired",
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

/* Endings are order-3 on a phone and order-5 from sm, so they land under
   the row Played is in: after Playing on a phone, after all four from sm. */
const PLATE_ORDER = ["order-1", "order-2", "order-4", "order-4"];

/** Picks how a played run ended. In plain sight under the plates rather than
 *  in a menu: as a dropdown on the Played plate, testers never found it. */
const Endings = ({
    value,
    onChange,
}: {
    value: PlayedStatus | null;
    onChange: (status: PlayedStatus | null) => void;
}) => (
    <div
        role="group"
        aria-label="How it ended"
        className="relative order-3 col-span-2 animate-rise rounded-md border border-subtle bg-surface-sunken p-2 sm:order-5 sm:col-span-4"
    >
        {/* Points at the Played plate: the first of two columns on a phone,
            of four from sm. The row sits under whichever row Played is in. */}
        <span
            aria-hidden
            className="absolute -top-[7px] left-[calc(25%-12px)] size-3 rotate-45 border-t border-l border-subtle bg-surface-sunken sm:left-[calc(12.5%-12px)]"
        />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PLAYED_STATUSES.map((status) => {
                const { label, hint } = STATUS_PRESENTATION[status];
                const selected = status === value;
                return (
                    <button
                        key={status}
                        type="button"
                        aria-pressed={selected}
                        // Again to clear it: plain Played is a real answer.
                        onClick={() => onChange(selected ? null : status)}
                        className={cn(
                            "group flex min-h-11 items-center gap-2 rounded-md border px-2.5 py-2 text-left lift focus-visible:outline-2 focus-visible:outline-offset-2",
                            RING[status],
                            selected
                                ? cn(
                                      STATUS_PRESENTATION[status].chip,
                                      "shadow-plate"
                                  )
                                : RESTING
                        )}
                    >
                        <Disc status={status} selected={selected} size={26} />
                        <span className="flex min-w-0 flex-col">
                            <span className="truncate text-body-sm font-medium">
                                {label}
                            </span>
                            <span className="truncate text-label-sm text-content-muted">
                                {hint}
                            </span>
                        </span>
                    </button>
                );
            })}
        </div>
    </div>
);

export const StatusPlates = ({
    value,
    onChange,
    playedStatus,
    onPlayedStatusChange,
}: {
    value: GameStatus;
    onChange: (status: GameStatus) => void;
    playedStatus: PlayedStatus | null;
    onPlayedStatusChange: (status: PlayedStatus | null) => void;
}) => (
    <fieldset>
        <legend className="mb-2.5 text-label text-content-muted">Status</legend>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {GAME_STATUSES.map((status, index) => {
                const { label } = STATUS_PRESENTATION[status];
                const selected = status === value;
                const plate = (
                    <button
                        key={status}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => onChange(status)}
                        className={cn(
                            BASE,
                            PLATE_ORDER[index],
                            RING[status],
                            selected
                                ? cn(
                                      STATUS_PRESENTATION[status].chip,
                                      "shadow-plate"
                                  )
                                : RESTING
                        )}
                    >
                        <Disc status={status} selected={selected} />
                        <span className="min-w-0 truncate text-body-sm font-medium">
                            {label}
                        </span>
                    </button>
                );
                // Next to its plate in the reading order: it refines it.
                return status === "played" && selected ? (
                    <Fragment key={status}>
                        {plate}
                        <Endings
                            value={playedStatus}
                            onChange={onPlayedStatusChange}
                        />
                    </Fragment>
                ) : (
                    plate
                );
            })}
        </div>
    </fieldset>
);
