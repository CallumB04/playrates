import { formatRating } from "../../lib/format";
import { cn } from "../../lib/cn";

type BadgeSize = "sm" | "md" | "lg";

const SIZE: Record<BadgeSize, string> = {
    sm: "text-figure-sm",
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
 * needs no meter beside it to be read.
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
        {value === null ? (
            "Not rated"
        ) : (
            <>
                {formatRating(value)}
                <span className="text-[0.72em] text-content-muted">/10</span>
            </>
        )}
    </span>
);

export default RatingBadge;
