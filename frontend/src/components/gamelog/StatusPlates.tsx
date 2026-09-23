import type { ComponentType, SVGProps } from "react";
import {
    GAME_STATUSES,
    PLAYED_STATUSES,
    STATUS_PRESENTATION,
    type DisplayStatus,
    type GameStatus,
    type PlayedStatus,
} from "../../constants/gameStatus";
import { ChevronDown } from "lucide-react";
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
           CHECK constraint still lists only the four below. Same word as
           the plate, so choosing it is visibly choosing nothing further. */
        value: "",
        label: "Played",
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
            {GAME_STATUSES.map((status) => {
                const { label } = STATUS_PRESENTATION[status];
                const selected = status === value;

                /* The chosen played plate opens onto its substatuses in place,
                   rather than a second row appearing below. The disc stays the
                   played mark: the row's hues belong to the four statuses, and
                   a gold trophy inside a green plate reads as a mistake. */
                if (status === "played" && selected) {
                    return (
                        <Dropdown
                            key={status}
                            options={PLAYED_OPTIONS}
                            value={playedStatus ?? ""}
                            aria-label="How it ended"
                            onChange={(next) =>
                                onPlayedStatusChange(
                                    (next || null) as PlayedStatus | null
                                )
                            }
                            triggerClassName={cn(
                                BASE,
                                "w-full",
                                TILE.played.ring,
                                TILE.played.on,
                                "shadow-plate"
                            )}
                            renderTrigger={(chosen, open) => (
                                <>
                                    <Disc status="played" selected />
                                    <span className="min-w-0 flex-1 truncate text-body-sm font-medium">
                                        {chosen?.label ?? label}
                                    </span>
                                    <ChevronDown
                                        size={14}
                                        aria-hidden
                                        className={cn(
                                            "shrink-0 text-content-secondary transition-transform duration-200",
                                            open && "rotate-180"
                                        )}
                                    />
                                </>
                            )}
                        />
                    );
                }

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
