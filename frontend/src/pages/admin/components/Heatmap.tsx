import {
    useState,
    type KeyboardEvent,
    type PointerEvent,
    type ReactNode,
} from "react";
import { cn } from "../../../lib/cn";
import { heatLevel } from "../lib/plot";

export interface HeatDay {
    /** YYYY-MM-DD, UTC, oldest first and one per day. */
    day: string;
    value: number;
}

/** Five steps of one hue: nothing, then quarters of the busiest day. Written
 *  out whole so the classes exist for the stylesheet. */
const TONES = {
    brand: [
        "bg-surface-sunken",
        "bg-brand/25",
        "bg-brand/45",
        "bg-brand/70",
        "bg-brand",
    ],
    teal: [
        "bg-surface-sunken",
        "bg-chart-2/25",
        "bg-chart-2/45",
        "bg-chart-2/70",
        "bg-chart-2",
    ],
} as const;

const WEEKDAYS = ["Mon", "", "Wed", "", "Fri", "", ""];

/**
 * Days as a calendar, a week to a column: the shape to read here is which
 * days of the week people come, and whether whole weeks go quiet, which a
 * line flattens away. The first column is padded so rows stay weekdays.
 */
const Heatmap = ({
    days,
    label,
    describe,
    readout = describe,
    tone = "brand",
    className,
}: {
    days: HeatDay[];
    tone?: keyof typeof TONES;
    label: string;
    describe: (day: HeatDay) => string;
    readout?: (day: HeatDay) => ReactNode;
    className?: string;
}) => {
    const LEVELS = TONES[tone];
    const latest = Math.max(0, days.length - 1);
    const [picked, setPicked] = useState<number | null>(null);
    const index = Math.min(picked ?? latest, latest);
    const peak = Math.max(1, ...days.map((d) => d.value));
    // Monday is 0, as the rows run.
    const lead = days[0]
        ? (new Date(`${days[0].day}T00:00:00Z`).getUTCDay() + 6) % 7
        : 0;
    const weeks = Math.ceil((lead + days.length) / 7);

    const pickFrom = (event: PointerEvent<HTMLDivElement>) => {
        const i = (event.target as HTMLElement).dataset.i;
        if (i !== undefined) setPicked(Number(i));
    };

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        const step: Record<string, number> = {
            ArrowUp: -1,
            ArrowDown: 1,
            ArrowLeft: -7,
            ArrowRight: 7,
        };
        if (event.key === "Home" || event.key === "End") {
            event.preventDefault();
            setPicked(event.key === "Home" ? 0 : latest);
            return;
        }
        if (!(event.key in step)) return;
        event.preventDefault();
        setPicked(Math.min(latest, Math.max(0, index + step[event.key]!)));
    };

    return (
        <div className={cn("flex min-w-0 flex-col gap-2.5", className)}>
            <div
                aria-hidden
                className="min-h-5 text-label text-content-secondary"
            >
                {days[index] && readout(days[index])}
            </div>

            {/* One grid for the weekday labels and the days, so every label
                sits on its row; the cap keeps a wide popup from blowing the
                squares up into tiles. */}
            <div
                role="slider"
                tabIndex={0}
                aria-label={label}
                aria-valuemin={0}
                aria-valuemax={latest}
                aria-valuenow={index}
                aria-valuetext={days[index] ? describe(days[index]) : "No data"}
                onPointerMove={pickFrom}
                onPointerDown={pickFrom}
                onPointerLeave={(e) =>
                    e.pointerType === "mouse" && setPicked(null)
                }
                onBlur={() => setPicked(null)}
                onKeyDown={onKeyDown}
                className="grid w-full max-w-[24rem] grid-flow-col grid-rows-7 gap-[3px] rounded-xs focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
                style={{
                    gridTemplateColumns: `auto repeat(${weeks}, minmax(0, 1fr))`,
                }}
            >
                {WEEKDAYS.map((d, i) => (
                    <span
                        key={`label-${i}`}
                        aria-hidden
                        className="flex items-center pr-1.5 font-mono text-stamp leading-none text-content-muted"
                    >
                        {d}
                    </span>
                ))}
                {Array.from({ length: lead }, (_, i) => (
                    <span key={`pad-${i}`} aria-hidden />
                ))}
                {days.map((d, i) => (
                    <span
                        key={d.day}
                        data-i={i}
                        aria-hidden
                        className={cn(
                            "aspect-square w-full rounded-[3px]",
                            LEVELS[heatLevel(d.value, peak)],
                            i === index &&
                                "ring-2 ring-content ring-offset-1 ring-offset-surface-raised"
                        )}
                    />
                ))}
            </div>

            <div
                aria-hidden
                className="flex w-full max-w-[24rem] items-center justify-end gap-1.5 text-label-sm text-content-muted"
            >
                Fewer
                {LEVELS.map((l) => (
                    <span key={l} className={cn("size-2.5 rounded-[2px]", l)} />
                ))}
                More
            </div>
        </div>
    );
};

export default Heatmap;
