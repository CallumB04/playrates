import { GAME_STATUSES, STATUS_PRESENTATION } from "../../../constants/gameStatus";
import { STATUS_MARKS } from "../../../lib/marks";
import { formatCount, formatPercent } from "../../../lib/format";
import { cn } from "../../../lib/cn";

interface CirculationPlateProps {
    byStatus: Record<string, number>;
    logCount: number;
}

/** How the shelf holds this game: four rows, hue, bar, count and share. */
const CirculationPlate = ({ byStatus, logCount }: CirculationPlateProps) => (
    <section>
        <h2 className="border-b border-subtle pb-2 text-label text-content-muted">
            {logCount === 0
                ? "Not logged yet"
                : `Logged by ${formatCount(logCount)} · by status`}
        </h2>

        {GAME_STATUSES.map((status) => {
            const { label, mark, markTone, accent } = STATUS_PRESENTATION[status];
            const Mark = STATUS_MARKS[mark];
            const count = byStatus[status] ?? 0;
            const share = logCount === 0 ? 0 : count / logCount;

            return (
                <div
                    key={status}
                    className="flex items-center gap-3.5 border-b border-subtle py-2.5"
                >
                    <Mark className={cn("w-4 shrink-0 text-[11px]", markTone)} />
                    <span className="w-20 shrink-0 text-body-sm font-medium text-content sm:w-24">
                        {label}
                    </span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                        <span
                            className={cn("block h-full rounded-full", accent)}
                            style={{ width: `${share * 100}%` }}
                        />
                    </span>
                    <span className="w-14 shrink-0 text-right font-mono text-body-sm font-semibold text-content sm:w-[70px]">
                        {formatCount(count)}
                    </span>
                    <span className="w-11 shrink-0 text-right font-mono text-[11.5px] text-content-muted">
                        {formatPercent(share)}
                    </span>
                </div>
            );
        })}
    </section>
);

export default CirculationPlate;
