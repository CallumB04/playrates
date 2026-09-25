import { useState } from "react";
import { popoverClass } from "../../../components/ui/popover";
import Progress from "../../../components/ui/Progress";
import {
    GAME_STATUSES,
    PLAYED_STATUSES,
    STATUS_PRESENTATION,
    type DisplayStatus,
} from "../../../constants/gameStatus";
import { formatCount, formatPercent } from "../../../lib/format";
import { cn } from "../../../lib/cn";

interface CirculationPlateProps {
    byStatus: Record<string, number>;
    /** A slice of byStatus.played; the rest carry no substatus. */
    byPlayedStatus: Record<string, number>;
    logCount: number;
}

interface Ending {
    key: string;
    /** Whose mark and hue it wears. Plain played has none of its own. */
    status: DisplayStatus;
    count: number;
}

/** How the shelf holds this game: the four states, hue, bar, count and share.
 *  The played bar is divided by how those plays ended. */
const CirculationPlate = ({
    byStatus,
    byPlayedStatus,
    logCount,
}: CirculationPlateProps) => {
    const [open, setOpen] = useState(false);

    const shareOf = (count: number) => (logCount === 0 ? 0 : count / logCount);
    const played = byStatus.played ?? 0;

    /* Plain played first, as the log editor lists it, then the four endings.
       The plain count is the remainder — what is left once the endings are
       taken off, which is a state of its own and usually the commonest. */
    const endings: Ending[] = [
        {
            key: "played",
            status: "played",
            count: Math.max(
                0,
                PLAYED_STATUSES.reduce(
                    (left, s) => left - (byPlayedStatus[s] ?? 0),
                    played
                )
            ),
        },
        ...PLAYED_STATUSES.map((status) => ({
            key: status,
            status,
            count: byPlayedStatus[status] ?? 0,
        })),
    ];

    return (
        <section>
            <h2 className="border-b border-subtle pb-2 text-label text-content-muted">
                {logCount === 0
                    ? "Not logged yet"
                    : `Logged by ${formatCount(logCount)} · by status`}
            </h2>

            {GAME_STATUSES.map((status) => {
                const {
                    label,
                    icon: Mark,
                    markTone,
                    accent,
                } = STATUS_PRESENTATION[status];
                const count = byStatus[status] ?? 0;
                const divided = status === "played" && played > 0;

                /* The played bar is divided: the endings make up the played
                   share rather than sitting beside it. */
                const track = divided ? (
                    <Progress
                        label={`${label}: ${formatPercent(shareOf(count))}`}
                        segments={endings.map((ending) => ({
                            key: ending.key,
                            value: shareOf(ending.count),
                            className:
                                STATUS_PRESENTATION[ending.status].accent,
                        }))}
                    />
                ) : (
                    <Progress
                        value={shareOf(count)}
                        label={`${label}: ${formatPercent(shareOf(count))}`}
                        fillClassName={accent}
                    />
                );

                return (
                    <div
                        key={status}
                        className={cn(
                            "flex items-center gap-3.5 border-b border-subtle",
                            divided ? "py-0" : "py-2.5"
                        )}
                    >
                        <Mark
                            size={14}
                            aria-hidden
                            className={cn("shrink-0", markTone)}
                        />
                        <span className="w-20 shrink-0 text-body-sm font-medium text-content sm:w-24">
                            {label}
                        </span>

                        {divided ? (
                            <div className="relative flex-1">
                                {/* Hover on a pointer, tap or focus otherwise —
                                    a touch screen cannot hover, and the
                                    breakdown is the point of the bar. */}
                                <button
                                    type="button"
                                    onMouseEnter={() => setOpen(true)}
                                    onMouseLeave={() => setOpen(false)}
                                    onFocus={() => setOpen(true)}
                                    onBlur={() => setOpen(false)}
                                    onClick={() => setOpen((was) => !was)}
                                    aria-expanded={open}
                                    aria-label="How those plays ended"
                                    /* 44px tall around an 8px bar, so the
                                       whole row is the target. The row drops
                                       its own padding to stay level with the
                                       three beside it. */
                                    className="block w-full cursor-pointer py-[18px]"
                                >
                                    {track}
                                </button>

                                {open && (
                                    <div
                                        role="tooltip"
                                        className={popoverClass(
                                            "absolute bottom-full left-0 z-20 mb-1 w-52 p-2"
                                        )}
                                    >
                                        <p className="px-1 pb-1.5 text-label text-content-muted">
                                            How it ended
                                        </p>
                                        {endings.map((ending) => {
                                            const {
                                                label: name,
                                                icon: EndMark,
                                                markTone: tone,
                                            } = STATUS_PRESENTATION[
                                                ending.status
                                            ];
                                            return (
                                                <div
                                                    key={ending.key}
                                                    className="flex items-center gap-2 px-1 py-1 text-body-sm"
                                                >
                                                    <EndMark
                                                        size={13}
                                                        aria-hidden
                                                        className={cn(
                                                            "shrink-0",
                                                            tone
                                                        )}
                                                    />
                                                    <span className="min-w-0 flex-1 truncate text-content-secondary">
                                                        {name}
                                                    </span>
                                                    <span className="shrink-0 font-mono text-body-sm font-semibold text-content">
                                                        {formatCount(
                                                            ending.count
                                                        )}
                                                    </span>
                                                    <span className="w-10 shrink-0 text-right font-mono text-[11.5px] text-content-muted">
                                                        {formatPercent(
                                                            shareOf(
                                                                ending.count
                                                            )
                                                        )}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <span className="flex-1">{track}</span>
                        )}

                        <span className="w-14 shrink-0 text-right font-mono text-body-sm font-semibold text-content sm:w-[70px]">
                            {formatCount(count)}
                        </span>
                        <span className="w-11 shrink-0 text-right font-mono text-[11.5px] text-content-muted">
                            {formatPercent(shareOf(count))}
                        </span>
                    </div>
                );
            })}
        </section>
    );
};

export default CirculationPlate;
