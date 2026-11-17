import { eventEnd, type EventTiming } from "@playrates/shared";
import { cn } from "../../lib/cn";
import { countdownParts } from "../../lib/events";
import { formatWeekdayTime } from "../../lib/format";
import { useNow } from "./useNow";

const NUMBER = {
    md: "text-[22px] sm:text-[26px]",
    lg: "text-[24px] sm:text-[34px]",
} as const;

/**
 * The time to an event, ticking: days, hours, minutes and seconds in one
 * strip. Once it starts it says so, with when it ends under it, and once
 * it's over, when it did, so the date beside it never stands alone.
 */
const Countdown = ({
    event,
    size = "md",
    className,
}: {
    event: { startsAt: string; endsAt: string | null; timing: EventTiming };
    size?: keyof typeof NUMBER;
    className?: string;
}) => {
    const now = useNow();
    const left = countdownParts(event.startsAt, now);

    if (!left) {
        const over = now >= eventEnd(event);
        const end = event.endsAt ?? new Date(eventEnd(event)).toISOString();
        const when =
            over || event.endsAt
                ? `${over ? "Ended" : "Ends"} ${formatWeekdayTime(end)}`
                : null;
        return (
            <div
                className={cn(
                    "flex min-w-0 items-start gap-2 text-body-sm",
                    className
                )}
            >
                <span
                    aria-hidden
                    className="relative mt-1.5 flex size-2 shrink-0"
                >
                    {!over && (
                        <span className="absolute inset-0 rounded-full bg-danger opacity-60 motion-safe:animate-ping" />
                    )}
                    <span
                        className={cn(
                            "relative size-2 rounded-full",
                            over ? "bg-content-muted" : "bg-danger"
                        )}
                    />
                </span>
                <p className="flex min-w-0 flex-col">
                    <span className="font-semibold text-content">
                        {over ? "Finished" : "On now"}
                    </span>
                    {when && (
                        <span className="text-content-secondary">{when}</span>
                    )}
                </p>
            </div>
        );
    }

    const units = [
        { value: left.days, label: left.days === 1 ? "day" : "days" },
        { value: left.hours, label: "hrs" },
        { value: left.minutes, label: "min" },
        { value: left.seconds, label: "sec" },
    ];
    return (
        <div
            role="timer"
            aria-label={`Starts in ${left.days} days, ${left.hours} hours and ${left.minutes} minutes`}
            className={cn(
                "inline-flex divide-x divide-subtle overflow-hidden rounded-md border border-subtle bg-surface/60 backdrop-blur-md",
                className
            )}
        >
            {units.map((unit) => (
                <span
                    key={unit.label}
                    aria-hidden
                    className="flex min-w-12 flex-1 basis-0 flex-col items-center px-2.5 py-2 sm:min-w-16 sm:px-3.5"
                >
                    <span
                        className={cn(
                            "font-display leading-none text-content tabular-nums",
                            NUMBER[size]
                        )}
                    >
                        {String(unit.value).padStart(2, "0")}
                    </span>
                    <span className="mt-1.5 text-[11px] leading-none text-content-muted">
                        {unit.label}
                    </span>
                </span>
            ))}
        </div>
    );
};

export default Countdown;
