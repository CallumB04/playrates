import { dateParts } from "../../lib/format";
import { cn } from "../../lib/cn";

const DAY = {
    sm: "text-[30px]",
    md: "text-[36px]",
    lg: "text-[40px] sm:text-[52px]",
} as const;

/**
 * When an event is, as a fixture list sets it: the day large, and beside it
 * the month and year over the weekday and time. Across rather than down, so it sits
 * on a line of words instead of standing apart from them. In the viewer's
 * own zone; the month greys once it's over.
 */
const EventDate = ({
    iso,
    past = false,
    size = "md",
    className,
}: {
    iso: string;
    past?: boolean;
    size?: keyof typeof DAY;
    className?: string;
}) => {
    const { month, day, year, weekday, time } = dateParts(iso);
    return (
        <time
            dateTime={iso}
            className={cn("flex shrink-0 items-center gap-2.5", className)}
        >
            <span
                className={cn(
                    "font-display leading-none font-semibold tracking-tight text-content tabular-nums",
                    DAY[size]
                )}
            >
                {day}
            </span>
            <span className="flex flex-col gap-0.5 leading-tight">
                <span
                    className={cn(
                        "text-label-sm font-semibold tracking-[0.12em] uppercase",
                        past ? "text-content-muted" : "text-brand-text"
                    )}
                >
                    {month} {year}
                </span>
                <span className="text-label-sm whitespace-nowrap text-content-secondary">
                    {weekday} {time}
                </span>
            </span>
        </time>
    );
};

export default EventDate;
