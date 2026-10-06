import { cn } from "./cn";

const tone = (score: number): string => {
    if (score >= 75) return "bg-success-subtle text-success-content";
    if (score >= 50) return "bg-warning-subtle text-warning-content";
    return "bg-danger-subtle text-danger-content";
};

const SIZE = {
    /** On a tile's foot line, beside the platform marks. */
    sm: "rounded-xs px-1 text-[11px]",
    /** The plate on a game page. */
    lg: "grid size-14 place-items-center rounded-sm text-2xl",
} as const;

/** The critics' average in its band's colour. One component at two sizes,
 *  so the figure under a cover and the one on the game page cannot drift
 *  apart. */
const CriticScore = ({
    score,
    size = "sm",
    className,
}: {
    score: number | null;
    size?: keyof typeof SIZE;
    className?: string;
}) =>
    score === null ? (
        <span className={cn("font-mono text-figure-sm", className)}>—</span>
    ) : (
        <span
            className={cn(
                "shrink-0 font-mono font-bold tabular-nums",
                SIZE[size],
                tone(score),
                className
            )}
        >
            {score}
        </span>
    );

export default CriticScore;
