import type { ComponentType, SVGProps } from "react";
import {
    GAME_STATUSES,
    PLAYED_STATUSES,
    STATUS_PRESENTATION,
    type DisplayStatus,
    type GameStatus,
    type PlayedStatus,
} from "../../constants/gameStatus";
import { cn } from "../../lib/cn";
import Dropdown, { type DropdownOption } from "../ui/Dropdown";

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

type IconProps = SVGProps<SVGSVGElement> & { size?: number | string };

/** The mark keeps its own hue in the menu, the way it does on a plate. Built
 *  once at module scope: a component rebuilt per render remounts the icon. */
const tonedMark = (status: DisplayStatus): ComponentType<IconProps> => {
    const { icon: Icon, markTone } = STATUS_PRESENTATION[status];
    const Mark = ({ className, ...props }: IconProps) => (
        <Icon {...props} className={cn(markTone, className)} />
    );
    Mark.displayName = `${status}Mark`;
    return Mark;
};

const PLAYED_OPTIONS: DropdownOption[] = [
    {
        /* Empty rather than a fifth status: played_status stays null, and its
           CHECK constraint still lists only the four below. */
        value: "",
        label: "Just played",
        icon: tonedMark("played"),
        hint: STATUS_PRESENTATION.played.hint,
    },
    ...PLAYED_STATUSES.map((status) => ({
        value: status,
        label: STATUS_PRESENTATION[status].label,
        icon: tonedMark(status),
        hint: STATUS_PRESENTATION[status].hint,
    })),
];

/**
 * The substatus, as a menu rather than a second row of plates. It refines
 * "played" rather than standing beside it, and a row of tiles gave it the same
 * weight as the status itself.
 */
export const PlayedStatusSelect = ({
    value,
    onChange,
}: {
    value: PlayedStatus | null;
    onChange: (status: PlayedStatus | null) => void;
}) => (
    <div>
        <span
            id="log-played-label"
            className="mb-2 block text-label text-content-muted"
        >
            How it ended
        </span>
        <Dropdown
            options={PLAYED_OPTIONS}
            value={value ?? ""}
            aria-labelledby="log-played-label"
            onChange={(next) => onChange((next || null) as PlayedStatus | null)}
            className="w-full sm:max-w-[280px]"
        />
    </div>
);
