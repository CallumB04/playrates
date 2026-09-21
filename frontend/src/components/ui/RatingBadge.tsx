import { formatRating } from "../../lib/format";
import { cn } from "../../lib/cn";

type BadgeSize = "sm" | "row" | "md" | "lg";

const SIZE: Record<BadgeSize, string> = {
    sm: "text-figure-sm",
    row: "text-figure-row",
    md: "text-figure-lg",
    lg: "text-figure",
};

interface RatingBadgeProps {
    value: number | null;
    size?: BadgeSize;
    className?: string;
}

/**
 * A rating, wherever one is shown. The "/10" carries the scale so the figure
 * needs no meter beside it to be read. An unrated thing keeps the shape and
 * drops the colour, so a column of them still lines up.
 */
const RatingBadge = ({ value, size = "sm", className }: RatingBadgeProps) => (
    <span
        className={cn(
            "font-mono leading-none tabular-nums",
            SIZE[size],
            value === null ? "text-content-muted" : "text-brand",
            className
        )}
    >
        {formatRating(value)}
        <span className="text-[0.72em] text-content-muted">/10</span>
    </span>
);

export default RatingBadge;
