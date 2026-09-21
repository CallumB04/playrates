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
 * Twelve bars, one per month of this year.
 *
 * Built from the logs already on the page rather than from a new aggregate:
 * the figure that matters is the shape of a year, and a shape does not need
 * to be exact to the row. A month with nothing in it still gets a bar so the
 * gaps read as gaps rather than as the chart ending early.
 */
const YearChart = ({ logs }: { logs: GameLogWithGame[] }) => {
    const { counts, peak, total } = useMemo(() => {
        const year = new Date().getFullYear();
        const counts = new Array<number>(12).fill(0);

        for (const log of logs) {
            // finishDate is the honest date for "when did this happen";
            // updatedAt is when the row was last touched, which is not it.
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

    if (total === 0) return null;

    return (
        <div>
            <div className="flex h-20 items-end gap-1.5">
                {counts.map((count, i) => (
                    <div
                        key={i}
                        className="group/bar flex flex-1 flex-col items-center gap-1.5"
                        title={`${count} in ${
                            ["January","February","March","April","May","June","July","August","September","October","November","December"][i]
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
                                height: `${Math.max(
                                    4,
                                    (count / peak) * 100
                                )}%`,
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
