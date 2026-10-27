import { useMemo, type ReactNode } from "react";
import type { UserStats } from "@playrates/shared";
import { latestRun } from "../../../api";
import { useUserShelf } from "../../../hooks/queries/useGameLogs";
import { cardClass } from "../../../components/ui/Card";
import { figureClass } from "../../../components/ui/Figure";
import RatingBadge from "../../../components/ui/RatingBadge";
import { Skeleton } from "../../../components/ui/Skeleton";
import YearChart from "../../../components/gamelog/YearChart";
import { formatCount, formatHours } from "../../../lib/format";

interface OverviewViewProps {
    username: string;
    isOwner: boolean;
    canSee: boolean;
    stats: UserStats | undefined;
}

const plural = (n: number, one: string, many: string) =>
    `${formatCount(n)} ${n === 1 ? one : many}`;

const Pending = ({ className }: { className: string }) => (
    <Skeleton className={`inline-block h-[1em] align-top ${className}`} />
);

/** One figure: what it is, the figure, what it is made of. */
const Figure = ({
    label,
    value,
    note,
}: {
    label: string;
    /** Undefined while it loads, as is the note. */
    value: ReactNode | undefined;
    note: string | undefined;
}) => (
    <div className="min-w-0">
        <dt className="text-label-sm text-content-muted">{label}</dt>
        <dd className={figureClass("lg", "mt-1.5 truncate")}>
            {value ?? <Pending className="w-16" />}
        </dd>
        <dd className="mt-1 truncate text-label-sm text-content-muted">
            {note ?? <Pending className="w-14" />}
        </dd>
    </div>
);

/** The profile at a glance: what spans every view, rather than any one of
 *  them. One card: two figures, and the year so far in played games. */
const OverviewView = ({
    username,
    isOwner,
    canSee,
    stats,
}: OverviewViewProps) => {
    const year = new Date().getFullYear();

    // The same hundred the home page charts, most recently played first.
    const { data: played, isLoading } = useUserShelf(
        username,
        "played",
        { page: 1, limit: 100, sort: "played", direction: "desc" },
        canSee
    );
    // A game counts once in the year however many consoles it was played on.
    const yearLogs = useMemo(
        () => (played?.data ?? []).map(latestRun),
        [played]
    );
    const playedThisYear = yearLogs.filter((log) => {
        const when = log.finishDate ?? log.startDate;
        return !!when && new Date(when).getFullYear() === year;
    }).length;
    const yearLoading = isLoading || !canSee;

    return (
        /* The figures beside the year from lg, above it on anything
           narrower, so the card is one band rather than three. */
        <section
            className={cardClass(
                "flex flex-col gap-4 lg:flex-row lg:items-center"
            )}
        >
            <dl className="grid grid-cols-2 gap-4 lg:flex lg:shrink-0 lg:items-center lg:gap-8 lg:self-stretch lg:border-r lg:border-subtle lg:pr-8">
                <Figure
                    label="Hours played"
                    value={stats && formatHours(stats.hoursPlayed)}
                    note={
                        stats &&
                        `Across ${plural(stats.gameCount, "game", "games")}`
                    }
                />
                <Figure
                    label="Average rating"
                    value={
                        stats && (
                            <RatingBadge
                                value={stats.averageRating}
                                size="md"
                            />
                        )
                    }
                    note={
                        stats &&
                        (stats.ratingCount > 0
                            ? `From ${plural(stats.ratingCount, "rating", "ratings")}`
                            : "Nothing rated yet")
                    }
                />
            </dl>

            <div className="min-w-0 flex-1 border-t border-subtle pt-4 lg:border-t-0 lg:pt-0 lg:pl-8">
                <h2 className="text-label-sm text-content-muted">
                    Played in {year}
                </h2>
                {/* The count says what the bars add up to, so they need no
                    legend: each is a month's share of it. */}
                <div className="mt-1.5 flex items-end gap-4 sm:gap-6">
                    <div className="shrink-0">
                        <p className={figureClass("lg")}>
                            {yearLoading ? (
                                <Pending className="w-8" />
                            ) : (
                                formatCount(playedThisYear)
                            )}
                        </p>
                        <p className="mt-1 text-label-sm text-content-muted">
                            {playedThisYear === 1 ? "game" : "games"}
                        </p>
                    </div>
                    <div className="min-w-0 flex-1">
                        {yearLoading ? (
                            <Skeleton className="h-16 w-full rounded-xs" />
                        ) : (
                            <YearChart
                                logs={yearLogs}
                                barsClassName="h-16"
                                labelled
                                emptyNote={
                                    isOwner
                                        ? "Games you finish this year chart here, by month."
                                        : "Nothing played yet this year."
                                }
                            />
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default OverviewView;
