import { cn } from "../../../lib/cn";

/**
 * How much of an allowance is gone, and where it is heading: the fill is spent,
 * the ember tick is where this pace ends up by the reset. Two readings on one
 * track, because the second only means anything against the first.
 */
const Meter = ({
    used,
    total,
    projected,
    label,
    tone = "ok",
    className,
}: {
    used: number;
    total: number;
    /** Where it ends up by the reset at this pace; past the end when over. */
    projected?: number;
    label: string;
    tone?: "ok" | "warning" | "danger";
    className?: string;
}) => {
    const share = (n: number) =>
        `${Math.min(100, Math.max(0, (n / Math.max(1, total)) * 100))}%`;
    return (
        <div
            role="img"
            aria-label={label}
            className={cn("relative h-2.5", className)}
        >
            <span className="absolute inset-0 overflow-hidden rounded-full bg-surface-sunken">
                <span
                    className={cn(
                        "block h-full rounded-full transition-[width] duration-500",
                        tone === "ok"
                            ? "bg-brand"
                            : tone === "warning"
                              ? "bg-warning"
                              : "bg-danger"
                    )}
                    style={{ width: share(used) }}
                />
            </span>
            {projected !== undefined && (
                <span
                    aria-hidden
                    className="absolute -top-1 -bottom-1 w-0.5 -translate-x-1/2 rounded-full bg-accent"
                    style={{ left: share(projected) }}
                />
            )}
        </div>
    );
};

export default Meter;
