import { useState } from "react";
import { ChevronDown } from "lucide-react";
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
    /** A slice of byStatus.played; the rest recorded no ending. */
    byPlayedStatus: Record<string, number>;
    logCount: number;
}

interface Segment {
    key: string;
    label: string;
    count: number;
    accent: string;
}

/** The row anatomy, shared by a status and by an ending under it. */
const Row = ({
    mark,
    label,
    bar,
    count,
    share,
    inset = false,
}: {
    mark: React.ReactNode;
    label: React.ReactNode;
    bar: React.ReactNode;
    count: number;
    share: number;
    inset?: boolean;
}) => (
    <div
        className={cn(
            "flex items-center gap-3.5 border-b border-subtle py-2.5",
            inset && "border-dashed pl-4 sm:pl-7"
        )}
    >
        {mark}
        <span
            className={cn(
                "w-20 shrink-0 sm:w-24",
                inset
                    ? "text-body-sm text-content-secondary"
                    : "text-body-sm font-medium text-content"
            )}
        >
            {label}
        </span>
        <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-sunken">
            {bar}
        </span>
        <span
            className={cn(
                "w-14 shrink-0 text-right font-mono text-body-sm sm:w-[70px]",
                inset ? "text-content-secondary" : "font-semibold text-content"
            )}
        >
            {formatCount(count)}
        </span>
        <span className="w-11 shrink-0 text-right font-mono text-[11.5px] text-content-muted">
            {formatPercent(share)}
        </span>
    </div>
);

/** How the shelf holds this game: the four states, hue, bar, count and share.
 *  The played bar carries its endings, since they are what it is made of. */
const CirculationPlate = ({
    byStatus,
    byPlayedStatus,
    logCount,
}: CirculationPlateProps) => {
    const [open, setOpen] = useState(false);

    const shareOf = (count: number) => (logCount === 0 ? 0 : count / logCount);
    const played = byStatus.played ?? 0;

    /* Every ending, then whatever is left — a played log with no ending is not
       a missing row, it is the commonest one. */
    const endings: Segment[] = PLAYED_STATUSES.map((status) => ({
        key: status,
        label: STATUS_PRESENTATION[status].label,
        count: byPlayedStatus[status] ?? 0,
        accent: STATUS_PRESENTATION[status].accent,
    }));
    const noEnding = endings.reduce((left, e) => left - e.count, played);
    const segments: Segment[] = [
        ...endings,
        {
            key: "none",
            label: "No ending",
            count: Math.max(0, noEnding),
            accent: STATUS_PRESENTATION.played.accent,
        },
    ].filter((segment) => segment.count > 0);

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
                const isPlayed = status === "played";
                const expandable = isPlayed && segments.length > 0;

                const mark = (
                    <Mark
                        size={14}
                        aria-hidden
                        className={cn("shrink-0", markTone)}
                    />
                );

                return (
                    <div key={status}>
                        <Row
                            mark={mark}
                            label={
                                expandable ? (
                                    <button
                                        type="button"
                                        onClick={() => setOpen((was) => !was)}
                                        aria-expanded={open}
                                        /* 44px to the touch without growing
                                           the glyph, which has a row to fit. */
                                        className="relative flex cursor-pointer items-center gap-1 text-left lift before:absolute before:-inset-3 before:content-[''] hover:text-content sm:before:hidden"
                                    >
                                        {label}
                                        <ChevronDown
                                            size={13}
                                            aria-hidden
                                            className={cn(
                                                "shrink-0 text-content-muted transition-transform duration-200",
                                                open && "rotate-180"
                                            )}
                                        />
                                    </button>
                                ) : (
                                    label
                                )
                            }
                            bar={
                                expandable ? (
                                    /* One bar, divided — the endings make up
                                       the played share rather than sitting
                                       beside it. */
                                    <span
                                        className="flex h-full"
                                        style={{
                                            width: `${shareOf(count) * 100}%`,
                                        }}
                                    >
                                        {segments.map((segment) => (
                                            <span
                                                key={segment.key}
                                                title={`${segment.label}: ${formatCount(segment.count)}`}
                                                className={cn(
                                                    "block h-full first:rounded-l-full last:rounded-r-full",
                                                    segment.accent
                                                )}
                                                style={{
                                                    width: `${
                                                        (segment.count /
                                                            count) *
                                                        100
                                                    }%`,
                                                }}
                                            />
                                        ))}
                                    </span>
                                ) : (
                                    <span
                                        className={cn(
                                            "block h-full rounded-full",
                                            accent
                                        )}
                                        style={{
                                            width: `${shareOf(count) * 100}%`,
                                        }}
                                    />
                                )
                            }
                            count={count}
                            share={shareOf(count)}
                        />

                        {expandable &&
                            open &&
                            segments.map((segment) => {
                                const EndingMark =
                                    segment.key === "none"
                                        ? STATUS_PRESENTATION.played.icon
                                        : STATUS_PRESENTATION[
                                              segment.key as DisplayStatus
                                          ].icon;
                                const tone =
                                    segment.key === "none"
                                        ? STATUS_PRESENTATION.played.markTone
                                        : STATUS_PRESENTATION[
                                              segment.key as DisplayStatus
                                          ].markTone;

                                return (
                                    <Row
                                        key={segment.key}
                                        inset
                                        mark={
                                            <EndingMark
                                                size={13}
                                                aria-hidden
                                                className={cn("shrink-0", tone)}
                                            />
                                        }
                                        label={segment.label}
                                        bar={
                                            <span
                                                className={cn(
                                                    "block h-full rounded-full",
                                                    segment.accent
                                                )}
                                                style={{
                                                    width: `${shareOf(segment.count) * 100}%`,
                                                }}
                                            />
                                        }
                                        count={segment.count}
                                        share={shareOf(segment.count)}
                                    />
                                );
                            })}
                    </div>
                );
            })}
        </section>
    );
};

export default CirculationPlate;
