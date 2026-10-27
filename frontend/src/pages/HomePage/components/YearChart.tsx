import { useMemo } from "react";
import type { GameLogWithGame } from "../../../api";
import { cn } from "../../../lib/cn";

const MONTHS = [
    "J",
    "F",
    "M",
    "A",
    "M",
    "J",
    "J",
    "A",
    "S",
    "O",
    "N",
    "D",
] as const;

/**
 * Twelve bars, one per month. Built from the logs already on the page — the
 * shape of a year doesn't need to be exact to the row. Empty months still get
 * a bar, so a gap reads as a gap rather than the chart ending early.
 */
/** Made-up heights for the placeholder, so an empty year still reads as a
 *  chart rather than a gap. */
const GHOST = [35, 55, 30, 65, 45, 80, 40, 60, 50, 75, 35, 55];

const YearChart = ({
    logs,
    barsClassName = "h-20",
    emptyNote,
}: {
    logs: GameLogWithGame[];
    /** The height of the bars. */
    barsClassName?: string;
    /** Shown over placeholder bars while the year has nothing in it.
     *  Without one, an empty year draws nothing. */
    emptyNote?: string;
}) => {
    const { counts, peak, total } = useMemo(() => {
        const year = new Date().getFullYear();
        const counts = new Array<number>(12).fill(0);

        for (const log of logs) {
            // finishDate, not updatedAt — the latter is just the last edit.
            const when = log.finishDate ?? log.startDate;
            if (!when) continue;
            const date = new Date(when);
            if (date.getFullYear() !== year) continue;
            counts[date.getMonth()]! += 1;
        }

        return {
            counts,
            peak: Math.max(1, ...counts),
            total: counts.reduce((a, b) => a + b, 0),
        };
    }, [logs]);

    if (total === 0) {
        if (!emptyNote) return null;
        return (
            <div>
                <div
                    aria-hidden
                    className={cn("flex items-end gap-1.5", barsClassName)}
                >
                    {GHOST.map((height, i) => (
                        <span
                            key={i}
                            className="flex-1 rounded-xs border border-strong bg-surface-sunken"
                            style={{ height: `${height}%` }}
                        />
                    ))}
                </div>
                <p className="mt-2 text-label-sm text-content-muted">
                    {emptyNote}
                </p>
            </div>
        );
    }

    return (
        <div>
            <div className={cn("flex items-end gap-1.5", barsClassName)}>
                {counts.map((count, i) => (
                    <div
                        key={i}
                        /* h-full and justify-end: a percentage height needs a
                           parent with a height, and items-end on the row
                           leaves each column at content size, which is 0. */
                        className="group/bar flex h-full flex-1 flex-col justify-end"
                        title={`${count} in ${
                            [
                                "January",
                                "February",
                                "March",
                                "April",
                                "May",
                                "June",
                                "July",
                                "August",
                                "September",
                                "October",
                                "November",
                                "December",
                            ][i]
                        }`}
                    >
                        <span
                            className={cn(
                                "w-full rounded-xs transition-colors duration-200",
                                count > 0
                                    ? "bg-brand group-hover/bar:bg-brand-hover"
                                    : "bg-surface-sunken"
                            )}
                            style={{
                                height: `${Math.max(4, (count / peak) * 100)}%`,
                            }}
                        />
                    </div>
                ))}
            </div>
            <div className="mt-1.5 flex gap-1.5">
                {MONTHS.map((month, i) => (
                    <span
                        key={i}
                        className="flex-1 text-center font-mono text-[10px] text-content-muted"
                    >
                        {month}
                    </span>
                ))}
            </div>
        </div>
    );
};

export default YearChart;
