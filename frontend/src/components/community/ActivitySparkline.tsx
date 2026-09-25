import { TRENDING_WINDOW_DAYS } from "@playrates/shared";
import { cn } from "../../lib/cn";

/** Messages per day across the trending window, today on the right. Bars
 *  are scaled to the busiest day, so the shape reads even on a quiet thread. */
const ActivitySparkline = ({
    activity,
    className,
}: {
    activity: number[];
    className?: string;
}) => {
    const peak = Math.max(1, ...activity);
    const total = activity.reduce((sum, n) => sum + n, 0);

    return (
        <div
            role="img"
            aria-label={`${total} messages over the last ${TRENDING_WINDOW_DAYS} days`}
            className={cn("flex h-12 items-end gap-[3px]", className)}
        >
            {activity.map((count, i) => (
                <span
                    key={i}
                    className={cn(
                        "min-h-0.5 flex-1 rounded-t-[2px]",
                        i === activity.length - 1 ? "bg-brand" : "bg-brand/35"
                    )}
                    style={{ height: `${(count / peak) * 100}%` }}
                />
            ))}
        </div>
    );
};

export default ActivitySparkline;
