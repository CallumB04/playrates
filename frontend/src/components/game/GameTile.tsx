import { Link } from "react-router-dom";
import { cn } from "../../lib/cn";
import type { DisplayStatus } from "../../constants/gameStatus";
import { formatRating } from "../../lib/format";
import GameCover from "./GameCover";
import StatusBadge from "../ui/StatusBadge";

export interface TileAction {
    key: string;
    label: string;
    onSelect: () => void;
    /** The first action is the loud one; the rest are outlines. */
    tone?: "primary" | "secondary" | "danger";
}

interface GameTileProps {
    gameId: number;
    title: string;
    coverUrl: string | null;
    /** The line under the cover: label left, figure right. */
    footLabel?: string;
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
const GameTile = ({
    gameId,
    title,
    coverUrl,
    footLabel,
    rating,
    footValue,
    status,
    meta,
    actions = [],
}: GameTileProps) => (
    <div className="group/tile">
        <Link
            to={`/game/${gameId}`}
            className="lift relative block aspect-3/4 overflow-hidden rounded-md bg-surface-media shadow-cover group-hover/tile:-translate-y-1 group-hover/tile:shadow-cover-hover group-hover/tile:shadow-glow"
        >
            <GameCover coverUrl={coverUrl} title={title} className="size-full" />

            {/* A wash on hover, so buttons read against pale box art. */}
            {actions.length > 0 && (
                <span
                    aria-hidden
                    className="absolute inset-0 bg-overlay-tile opacity-0 transition-opacity duration-300 group-hover/tile:opacity-100 group-focus-within/tile:opacity-100"
                />
            )}

            {status && (
                <StatusBadge
                    status={status}
                    size="stamp"
                    onMedia
                    className="absolute right-1.5 top-1.5"
                />
            )}

            <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-overlay-tile via-overlay-tile/80 to-transparent p-2.5 pt-12">
                {actions.length > 0 && (
                    /* Rows going 0fr to 1fr animates an auto height, so the
                       actions push in rather than popping. */
                    <span className="mb-0 grid grid-rows-[0fr] transition-[grid-template-rows,margin] duration-300 ease-[var(--ease-glide)] group-hover/tile:mb-2 group-hover/tile:grid-rows-[1fr] group-focus-within/tile:mb-2 group-focus-within/tile:grid-rows-[1fr]">
                        <span className="flex min-h-0 flex-col gap-1.5 overflow-hidden">
                            {actions.map((action) => (
                                <button
                                    key={action.key}
                                    type="button"
                                    onClick={(event) => {
                                        // The tile is a link; this is not navigation.
                                        event.preventDefault();
                                        action.onSelect();
                                    }}
                                    className={cn(
                                        "lift w-full cursor-pointer rounded-sm border px-2 py-1.5 text-[11px] font-medium",
                                        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-content-on-media",
                                        ACTION_TONE[action.tone ?? "secondary"]
                                    )}
                                >
                                    {action.label}
                                </button>
                            ))}
                        </span>
                    </span>
                )}

                <span className="block text-[13px] font-medium leading-tight text-content-on-media">
                    {title}
                </span>
                {meta && (
                    <span className="mt-1 block text-[10px] text-content-on-media/70">
                        {meta}
                    </span>
                )}
            </span>
        </Link>

        {(footLabel || rating !== undefined || footValue) && (
            <div className="mt-2 flex items-baseline gap-1">
                <span className="truncate text-[11px] text-content-muted">
                    {footLabel}
                </span>
                <span className="leader" aria-hidden="true" />
                <span
                    className={cn(
                        "font-mono text-figure-sm",
                        rating === null || rating === undefined
                            ? "text-content-muted"
                            : "text-brand"
                    )}
                >
                    {rating === undefined
                        ? (footValue ?? "")
                        : formatRating(rating)}
                </span>
            </div>
        )}
    </div>
);

export default GameTile;
