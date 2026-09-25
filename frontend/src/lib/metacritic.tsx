import { cn } from "./cn";

/** Metacritic's own banding: green from 75, yellow from 50, red below. Their
 *  colours, not the theme's — a critic score people recognise by its box. */
const tone = (score: number): string => {
    if (score >= 75) return "bg-[#66cc33] text-black";
    if (score >= 50) return "bg-[#ffcc33] text-black";
    return "bg-[#ff0000] text-white";
};

const SIZE = {
    /** On a tile's foot line, beside the platform marks. */
    sm: "rounded-xs px-1 text-[11px]",
    /** The plate on a game page. */
    lg: "grid size-14 place-items-center rounded-sm text-2xl",
} as const;

/** The score in its own colour. One component at two sizes, so the figure
 *  under a cover and the one on the game page cannot drift apart. */
const MetacriticScore = ({
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

export default MetacriticScore;
