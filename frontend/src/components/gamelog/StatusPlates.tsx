import type { ComponentType, SVGProps } from "react";
import {
    displayStatusFor,
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
        /* About the entry, not the game. The played status's own hint reads as
           a verdict here, and anything about being done with it trespasses on
           Shelved and Retired. */
        hint: "No further detail",
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

                /* The chosen played plate opens onto its substatuses in
                   place, rather than a second row appearing below, and wears
                   whichever one is chosen — mark, fill and focus ring — the
                   way a badge for that log would. */
                if (status === "played" && selected) {
                    const shown = displayStatusFor("played", playedStatus);

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
                                "w-full shadow-plate",
                                RING[shown],
                                STATUS_PRESENTATION[shown].chip
                            )}
                            renderTrigger={(chosen, open) => (
                                <>
                                    <Disc status={shown} selected />
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
            })}
        </div>
    </fieldset>
);
