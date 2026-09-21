import { Link } from "react-router-dom";
import { useState, type ComponentType, type SVGProps } from "react";
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
    /**
     * Renders as a square icon button beside its siblings rather than a full
     * -width row. Backlog and wishlist are one tap each and do not need a
     * word between them and the cover.
     */
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
    footValue?: string;
    /** Stamped on the cover when the viewer has logged it. */
    status?: DisplayStatus | null;
    /** A line under the title on hover, e.g. "Your log · 8.5 · 31h". */
    meta?: string;
    actions?: TileAction[];
}

const ACTION_TONE = {
    primary:
        "bg-brand text-content-on-solid border-brand-deep hover:bg-brand-hover active:bg-brand-active",
    secondary:
        "border-content-on-media/50 text-content-on-media hover:border-content-on-media hover:bg-overlay-chip-light active:bg-overlay-chip-light",
    danger: "bg-danger text-content-on-solid border-danger hover:brightness-110 active:brightness-95",
} as const;

/**
 * The shelf tile. Box art is the only saturated thing on the page, so the tile
 * is the art plus one line underneath, with the actions over it.
 *
 * The title stays put. It used to fade out on hover and get redrawn inside the
 * action overlay, which meant that on any tile without actions — every tile on
 * the home rails — hovering simply deleted the name of the game.
 */
/**
 * Optimistic state for the one-tap actions.
 *
 * The write takes a few hundred milliseconds, and an icon that looks
 * unchanged for that long invites a second press — which is a second log, or
 * at best a wasted request. The button fills and locks the moment it is
 * pressed, so the feedback is immediate and the second press cannot land.
 */
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
}: GameTileProps) => {
    const rows = actions.filter((a) => !a.icon);
    const icons = actions.filter((a) => a.icon);
    const [pressed, setPressed] = useState<Set<string>>(new Set());

    return (
        <div className="group/tile">
            <Link
                to={`/game/${gameId}`}
                /* The cover stays put. Lifting the art while the buttons were
                   also sliding in gave the tile two movements at once, which
                   read as the whole thing jumping. */
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

                <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-overlay-tile via-overlay-tile/80 to-transparent p-2.5 pt-12">
                    {actions.length > 0 && (
                        /* Rows going 0fr to 1fr animates an auto height, so
                           the actions make room rather than popping. The
                           inner block fades and rises a few pixels on top of
                           that, which is the part read as motion. */
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
                                                        "lift grid flex-1 place-items-center rounded-sm border py-1.5 transition-colors duration-200",
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
                        className="shrink-0 text-content-muted"
                    />
                    <span className="leader" aria-hidden="true" />
                    {rating === undefined ? (
                        <span className="shrink-0 whitespace-nowrap font-mono text-figure-sm text-content-muted">
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
