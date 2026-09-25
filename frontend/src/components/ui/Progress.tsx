import { cn } from "../../lib/cn";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";

const SIZE = {
    sm: "h-1.5",
    md: "h-2",
    lg: "h-2.5",
} as const;

export type ProgressSize = keyof typeof SIZE;

/** One part of a bar made of parts, as a share of the whole track. */
export interface ProgressSegment {
    key: string;
    /** 0–1 of the whole track, not of the other segments. */
    value: number;
    /** The segment's colour, e.g. a status accent. */
    className: string;
    title?: string;
}

interface ProgressProps {
    /** 0–1. Omit, along with segments, for the indeterminate sweep. */
    value?: number;
    /** A bar split into parts — a shelf by status, a played share by how
     *  those plays ended. Takes precedence over value. */
    segments?: ProgressSegment[];
    label: string;
    size?: ProgressSize;
    /** The fill's colour for a single value. The brand unless it says
     *  something the brand shouldn't — a status, a comparison. */
    fillClassName?: string;
    className?: string;
}

const TICKS = 12;
const clamp = (n: number) => Math.min(1, Math.max(0, n));
const percent = (n: number) => `${clamp(n) * 100}%`;

/** Determinate is a filled well; indeterminate is a sweep of ticks that holds
 *  still under reduced motion. */
const Progress = ({
    value,
    segments,
    label,
    size = "md",
    fillClassName = "bg-brand",
    className,
}: ProgressProps) => {
    const reduced = usePrefersReducedMotion();
    const determinate = value !== undefined;
    const track = cn(
        "block overflow-hidden rounded-full bg-surface-sunken",
        SIZE[size],
        className
    );

    // A breakdown is a picture of proportions, not a task under way.
    if (segments) {
        return (
            <span role="img" aria-label={label} className={cn(track, "flex")}>
                {segments
                    .filter((segment) => segment.value > 0)
                    .map((segment) => (
                        <span
                            key={segment.key}
                            title={segment.title}
                            className={cn(
                                "block h-full first:rounded-l-full last:rounded-r-full",
                                segment.className
                            )}
                            style={{ width: percent(segment.value) }}
                        />
                    ))}
            </span>
        );
    }

    return (
        <span
            role="progressbar"
            aria-label={label}
            aria-valuemin={determinate ? 0 : undefined}
            aria-valuemax={determinate ? 100 : undefined}
            aria-valuenow={
                determinate ? Math.round(clamp(value) * 100) : undefined
            }
            className={track}
        >
            {determinate ? (
                <span
                    className={cn(
                        "block h-full rounded-full transition-[width] duration-500 ease-[var(--ease-glide)]",
                        fillClassName
                    )}
                    style={{ width: percent(value) }}
                />
            ) : (
                <span className="flex h-full gap-1">
                    {Array.from({ length: TICKS }, (_, i) => (
                        <span
                            key={i}
                            className={cn(
                                "flex-1",
                                i > 3 && i < 8
                                    ? "bg-brand"
                                    : "bg-surface-sunken",
                                !reduced && "animate-pulse"
                            )}
                            style={
                                reduced
                                    ? undefined
                                    : { animationDelay: `${i * 60}ms` }
                            }
                        />
                    ))}
                </span>
            )}
        </span>
    );
};

export default Progress;
