import { formatRating } from "../../lib/format";
import { cn } from "../../lib/cn";

const MAX = 10;
/** Ten ticks, not twenty: at this size a half point is a shade, not a bar. */
const TICKS = 10;

type BadgeSize = "sm" | "md";

interface RatingBadgeProps {
    value: number | null;
    size?: BadgeSize;
    /** Drops the meter and shows the figure alone, for tight rows. */
    bare?: boolean;
    className?: string;
}

const SIZES: Record<BadgeSize, { text: string; tick: string; gap: string }> = {
    sm: { text: "text-figure-sm", tick: "h-1", gap: "gap-[2px]" },
    md: { text: "text-figure-lg", tick: "h-1.5", gap: "gap-[2.5px]" },
};

/**
 * A rating, wherever one is shown.
 *
 * Same vocabulary as the setter: the figure leads, and the meter underneath
 * gives it a shape you can read across a list without doing the arithmetic.
 * A partly-lit final tick is how a half point shows here.
 */
const RatingBadge = ({
    value,
    size = "sm",
    bare = false,
    className,
}: RatingBadgeProps) => {
    const { text, tick, gap } = SIZES[size];

    if (value === null) {
        return (
            <span
                className={cn(
                    "font-mono tabular-nums text-content-muted",
                    text,
                    className
                )}
            >
                Not rated
            </span>
        );
    }

    return (
        <span className={cn("inline-flex flex-col gap-1", className)}>
            <span
                className={cn(
                    "font-mono tabular-nums leading-none text-brand",
                    text
                )}
            >
                {formatRating(value)}
            </span>
            {!bare && (
                <span aria-hidden className={cn("flex w-14", gap)}>
                    {Array.from({ length: TICKS }, (_, i) => {
                        // How much of this tick the rating covers, 0 to 1.
                        const fill = Math.max(
                            0,
                            Math.min(1, (value / MAX) * TICKS - i)
                        );
                        return (
                            <span
                                key={i}
                                className={cn(
                                    "flex-1 overflow-hidden rounded-full bg-surface-sunken",
                                    tick
                                )}
                            >
                                {fill > 0 && (
                                    <span
                                        className="block h-full rounded-full bg-brand"
                                        style={{ width: `${fill * 100}%` }}
                                    />
                                )}
                            </span>
                        );
                    })}
                </span>
            )}
        </span>
    );
};

export default RatingBadge;
