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
    /** The ledger line under the cover: label left, figure right. */
    footLabel?: string;
    /** The viewer's own rating. The brand figure is reserved for these. */
    rating?: number | null;
    /** A muted figure for the right of the ledger line when there is no
     *  rating to show — a release year, say. */
    footValue?: string;
    /** Stamped on the cover, rotated, when the viewer has logged it. */
    status?: DisplayStatus | null;
    /** A mono line under the title on hover, e.g. "Your log · 8.50 · 31h". */
    meta?: string;
    actions?: TileAction[];
}

const ACTION_TONE = {
    primary: "bg-brand text-content-on-solid border-brand-deep",
    secondary:
        "border-content-on-media/50 text-content-on-media hover:bg-overlay-chip-light",
    danger: "bg-danger text-content-on-solid border-danger",
} as const;

/**
 * The shelf tile. Box art is the only saturated thing on the page, so the tile
 * is the art plus one ledger line — and the actions only appear over it.
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

            {/* Resting state: the title reads off the art itself. */}
            <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-overlay-tile to-transparent p-2.5 pt-10 text-[13px] font-medium leading-tight text-content-on-media transition-opacity group-hover/tile:opacity-0">
                {title}
            </span>

            {status && (
                <StatusBadge
                    status={status}
                    size="stamp"
                    onMedia
                    className="absolute right-1.5 top-1.5 group-hover/tile:opacity-0"
                />
            )}

            {actions.length > 0 && (
                <span className="absolute inset-0 flex flex-col gap-1.5 rounded-md bg-overlay-tile p-2.5 opacity-0 backdrop-blur-[2px] transition-opacity group-hover/tile:opacity-100 focus-within:opacity-100">
                    <span className="mb-auto block">
                        <span className="block text-[13px] font-medium leading-tight text-content-on-media">
                            {title}
                        </span>
                        {meta && (
                            <span className="mt-1 block text-[10px] text-content-on-media/70">
                                {meta}
                            </span>
                        )}
                    </span>

                    {actions.map((action) => (
                        <button
                            key={action.key}
                            type="button"
                            onClick={(event) => {
                                // The tile is a link; an action is not navigation.
                                event.preventDefault();
                                action.onSelect();
                            }}
                            className={cn(
                                "plate-press w-full border px-2 py-1.5 text-stamp",
                                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-content-on-media",
                                ACTION_TONE[action.tone ?? "secondary"]
                            )}
                        >
                            {action.label}
                        </button>
                    ))}
                </span>
            )}
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
