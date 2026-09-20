import { formatRating } from "../../lib/format";
import { cn } from "../../lib/cn";

export type RatingSize = "display" | "row" | "inline" | "tile";

const SIZE: Record<RatingSize, string> = {
    display: "text-figure",
    row: "text-figure-lg",
    inline: "text-figure-row",
    tile: "text-figure-sm",
};

interface RatingProps {
    value: number | null | undefined;
    size?: RatingSize;
    /** A mono caption beneath, e.g. "PlayRates average · 2,481 ratings". */
    caption?: string;
    className?: string;
}

/**
 * A tabular numeral is the display; the 40-detent rule is the setter. Never a
 * row of quarter-filled stars — this stays glanceable in a grid of forty.
 *
 * The brand figure is reserved for real PlayRates ratings, so an unrated thing
 * shows a muted em dash rather than borrowing the colour.
 */
const Rating = ({ value, size = "row", caption, className }: RatingProps) => {
    const rated = value !== null && value !== undefined;
    return (
        <div className={cn("flex flex-col", className)}>
            <span
                className={cn(
                    "font-mono font-semibold tabular-nums",
                    SIZE[size],
                    rated ? "text-brand" : "text-content-muted"
                )}
            >
                {formatRating(value)}
            </span>
            {caption && (
                <span className="mt-1.5 font-mono text-label-sm uppercase text-content-muted">
                    {caption}
                </span>
            )}
        </div>
    );
};

export default Rating;
