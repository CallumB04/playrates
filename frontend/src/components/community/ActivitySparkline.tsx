import { TRENDING_WINDOW_DAYS } from "@playrates/shared";
import { cn } from "../../lib/cn";

/* Complete class strings: Tailwind only emits what it can see. Today's bar
   is solid, the rest a tint of the same colour. */
const TONES = {
    brand: { today: "bg-brand", past: "bg-brand/35" },
    info: { today: "bg-info", past: "bg-info/35" },
    success: { today: "bg-success", past: "bg-success/35" },
} as const;

export type SparklineTone = keyof typeof TONES;

/** Messages per day across the trending window, today on the right. Bars
 *  are scaled to the busiest day, so the shape reads even on a quiet thread. */
const ActivitySparkline = ({
    activity,
    tone = "brand",
    className,
}: {
    activity: number[];
    tone?: SparklineTone;
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
                        i === activity.length - 1
                            ? TONES[tone].today
                            : TONES[tone].past
                    )}
                    style={{ height: `${(count / peak) * 100}%` }}
                />
            ))}
        </div>
    );
};

export default ActivitySparkline;
