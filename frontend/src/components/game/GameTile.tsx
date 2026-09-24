import { Link } from "react-router-dom";
import {
    useState,
    type ComponentType,
    type ReactNode,
    type SVGProps,
} from "react";
import { Plus } from "lucide-react";
import { cn } from "../../lib/cn";
import type { DisplayStatus } from "../../constants/gameStatus";
import type { Platform } from "@playrates/shared";
import GameCover from "./GameCover";
import PlatformMarks from "./PlatformMarks";
import StatusBadge from "../ui/StatusBadge";
import RatingBadge from "../ui/RatingBadge";

export interface TileAction {
    key: string;
    label: string;
    onSelect: () => void;
    /** The first action is the loud one; the rest are outlines. */
    tone?: "primary" | "secondary" | "danger";
    /** Renders as a square icon button rather than a full-width row. */
    icon?: ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;
}

interface GameTileProps {
    gameId: number;
    title: string;
    coverUrl: string | null;
    /** Platform marks on the left of the line under the cover. */
    platformSlugs?: string[];
    platforms?: Platform[];
    /** The viewer's own rating. The brand figure is reserved for these. */
    rating?: number | null;
    /** A muted figure for the right of the line when there is no rating to
     *  show, a release year for instance. */
    footValue?: ReactNode;
    /** Stamped on the cover when the viewer has logged it. */
    status?: DisplayStatus | null;
    /** A line under the title on hover, e.g. "Your log · 8.5 · 31h". */
    meta?: string;
    actions?: TileAction[];
    /** Drop the figure below `sm`, for grids too narrow to hold both it and
     *  the platform marks. */
    narrowFoot?: boolean;
}

const ACTION_TONE = {
    primary:
        "bg-brand text-content-on-solid border-brand-deep hover:bg-brand-hover active:bg-brand-active",
    secondary:
        "border-content-on-media/50 text-content-on-media hover:border-content-on-media hover:bg-overlay-chip-light active:bg-overlay-chip-light",
    danger: "bg-danger text-content-on-solid border-danger hover:brightness-110 active:brightness-95",
} as const;

/** The shelf tile: box art, one line underneath, actions over it on hover. */
const GameTile = ({
    gameId,
    title,
    coverUrl,
    platformSlugs,
    platforms,
    rating,
    footValue,
    status,
    meta,
    actions = [],
    narrowFoot = false,
}: GameTileProps) => {
    const rows = actions.filter((a) => !a.icon);
    const icons = actions.filter((a) => a.icon);
    const [pressed, setPressed] = useState<Set<string>>(new Set());

    const primary = rows[0] ?? icons[0];
    const PrimaryIcon = primary?.icon ?? Plus;

    return (
        <div className="group/tile">
            <Link
                to={`/game/${gameId}`}
                className="relative block aspect-3/4 overflow-hidden rounded-md bg-surface-media shadow-cover transition-shadow duration-500 ease-[var(--ease-glide)] group-hover/tile:shadow-cover-hover"
            >
                <GameCover
                    coverUrl={coverUrl}
                    title={title}
                    className="size-full"
                />

                {/* A wash on hover, so buttons read against pale box art. */}
                {actions.length > 0 && (
                    <span
                        aria-hidden
                        className="absolute inset-0 bg-overlay-tile opacity-0 transition-opacity duration-500 ease-[var(--ease-glide)] group-focus-within/tile:opacity-100 group-hover/tile:opacity-100"
                    />
                )}

                {status && (
                    <StatusBadge
                        status={status}
                        size="stamp"
                        onMedia
                        className="absolute top-1.5 right-1.5"
                    />
                )}

                {/* The rows below open on hover, which a touch screen can't
                    ask for, so the loud action gets a standing button. */}
                {primary && (
                    <button
                        type="button"
                        aria-label={primary.label}
                        onClick={(event) => {
                            event.preventDefault();
                            primary.onSelect();
                        }}
                        className={cn(
                            "absolute top-1.5 left-1.5 grid size-9 place-items-center rounded-full",
                            "border border-content-on-media/30 bg-overlay-tile text-content-on-media backdrop-blur-sm",
                            "active:bg-brand active:text-content-on-solid",
                            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-content-on-media",
                            "before:absolute before:-inset-1 before:content-['']",
                            "sm:hidden"
                        )}
                    >
                        <PrimaryIcon size={16} aria-hidden />
                    </button>
                )}

                <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-overlay-tile via-overlay-tile/80 to-transparent p-2.5 pt-12">
                    {actions.length > 0 && (
                        /* 0fr to 1fr animates an auto height, so the actions
                           make room rather than popping in. */
                        <span className="mb-0 grid grid-rows-[0fr] transition-[grid-template-rows,margin] duration-500 ease-[var(--ease-glide)] group-focus-within/tile:mb-2 group-focus-within/tile:grid-rows-[1fr] group-hover/tile:mb-2 group-hover/tile:grid-rows-[1fr]">
                            <span className="flex min-h-0 translate-y-1.5 flex-col gap-1.5 overflow-hidden opacity-0 transition-[opacity,transform] duration-500 ease-[var(--ease-glide)] group-focus-within/tile:translate-y-0 group-focus-within/tile:opacity-100 group-hover/tile:translate-y-0 group-hover/tile:opacity-100">
                                {rows.map((action) => (
                                    <button
                                        key={action.key}
                                        type="button"
                                        onClick={(event) => {
                                            // The tile is a link; this is not navigation.
                                            event.preventDefault();
                                            action.onSelect();
                                        }}
                                        className={cn(
                                            "w-full cursor-pointer rounded-sm border px-2 py-1.5 text-[11px] font-medium lift",
                                            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-content-on-media",
                                            ACTION_TONE[
                                                action.tone ?? "secondary"
                                            ]
                                        )}
                                    >
                                        {action.label}
                                    </button>
                                ))}

                                {icons.length > 0 && (
                                    <span className="flex gap-1.5">
                                        {icons.map((action) => {
                                            const Icon = action.icon!;
                                            return (
                                                <button
                                                    key={action.key}
                                                    type="button"
                                                    title={action.label}
                                                    aria-label={action.label}
                                                    disabled={pressed.has(
                                                        action.key
                                                    )}
                                                    onClick={(event) => {
                                                        event.preventDefault();
                                                        setPressed((set) =>
                                                            new Set(set).add(
                                                                action.key
                                                            )
                                                        );
                                                        action.onSelect();
                                                    }}
                                                    className={cn(
                                                        "grid flex-1 place-items-center rounded-sm border py-1.5 transition-colors duration-200 lift",
                                                        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-content-on-media",
                                                        pressed.has(action.key)
                                                            ? "cursor-default border-brand bg-brand text-content-on-solid"
                                                            : cn(
                                                                  "cursor-pointer",
                                                                  ACTION_TONE[
                                                                      action.tone ??
                                                                          "secondary"
                                                                  ]
                                                              )
                                                    )}
                                                >
                                                    <Icon
                                                        size={14}
                                                        aria-hidden
                                                    />
                                                </button>
                                            );
                                        })}
                                    </span>
                                )}
                            </span>
                        </span>
                    )}

                    <span className="block text-[13px] leading-tight font-medium text-content-on-media">
                        {title}
                    </span>
                    {meta && (
                        <span className="mt-1 block text-[10px] text-content-on-media/70">
                            {meta}
                        </span>
                    )}
                </span>
            </Link>

            {(platformSlugs || rating !== undefined || footValue) && (
                <div className="mt-2 flex items-center gap-1">
                    {/* Three, not four: the figure beside them is the
                        reason the tile is in this rail, so it gets the room. */}
                    <PlatformMarks
                        slugs={platformSlugs ?? []}
                        platforms={platforms ?? []}
                        max={3}
                        className={cn(
                            "text-content-muted",
                            narrowFoot
                                ? "min-w-0 shrink overflow-hidden sm:shrink-0"
                                : "shrink-0"
                        )}
                    />
                    <span
                        className={cn("leader", narrowFoot && "max-sm:hidden")}
                        aria-hidden="true"
                    />
                    {rating === undefined ? (
                        <span
                            className={cn(
                                "shrink-0 font-mono text-figure-sm whitespace-nowrap text-content-muted",
                                narrowFoot && "max-sm:hidden"
                            )}
                        >
                            {footValue ?? ""}
                        </span>
                    ) : (
                        <RatingBadge
                            value={rating}
                            className="shrink-0 whitespace-nowrap"
                        />
                    )}
                </div>
            )}
        </div>
    );
};

export default GameTile;
