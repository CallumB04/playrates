import { cn } from "../../lib/cn";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";

interface ProgressProps {
    /** 0–1. Omit for the indeterminate tick sweep. */
    value?: number;
    label: string;
    className?: string;
}

const TICKS = 12;

/**
 * Determinate is a filled well. Indeterminate is a sweep of ticks — the same
 * rule vocabulary rather than a spinner, and it holds still under reduced
 * motion rather than disappearing.
 */
const Progress = ({ value, label, className }: ProgressProps) => {
    const reduced = usePrefersReducedMotion();
    const determinate = value !== undefined;
    const percent = Math.round(Math.min(1, Math.max(0, value ?? 0)) * 100);

    return (
        <div
            role="progressbar"
            aria-label={label}
            aria-valuemin={determinate ? 0 : undefined}
            aria-valuemax={determinate ? 100 : undefined}
            aria-valuenow={determinate ? percent : undefined}
            className={cn(
                "h-2.5 overflow-hidden bg-surface-sunken",
                className
            )}
        >
            {determinate ? (
                <span
                    className="block h-full bg-brand transition-[width] duration-300"
                    style={{ width: `${percent}%` }}
                />
            ) : (
                <span className="flex h-full gap-1">
                    {Array.from({ length: TICKS }, (_, i) => (
                        <span
                            key={i}
                            className={cn(
                                "flex-1",
                                i > 3 && i < 8 ? "bg-brand" : "bg-surface-sunken",
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
        </div>
    );
};

export default Progress;
