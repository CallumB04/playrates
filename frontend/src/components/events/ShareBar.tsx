import { cn } from "../../lib/cn";

/**
 * A share of something, for the events' figures: a thin track and a solid
 * fill. Slimmer and quieter than ui/Progress, which is for a level or a
 * shelf.
 */
const ShareBar = ({
    value,
    label,
    muted = false,
    className,
}: {
    /** 0 to 1. */
    value: number;
    label: string;
    /** Greyed, for one that isn't the point: not the winner, say. */
    muted?: boolean;
    className?: string;
}) => {
    const share = Math.min(1, Math.max(0, value));
    return (
        <div
            role="progressbar"
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(share * 100)}
            className={cn(
                "h-1 overflow-hidden rounded-full bg-content/10",
                className
            )}
        >
            <div
                className={cn(
                    "h-full rounded-full motion-safe:transition-[width] motion-safe:duration-500",
                    muted ? "bg-content-muted/50" : "bg-brand"
                )}
                style={{ width: `${share * 100}%` }}
            />
        </div>
    );
};

export default ShareBar;
