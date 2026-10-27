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

const CardLabel = ({ children }: { children: ReactNode }) => (
    <h2 className="text-label text-content-muted">{children}</h2>
);

const FigureCard = ({
    label,
    figure,
    note,
}: {
    label: string;
    /** Undefined while it loads. */
    figure: ReactNode | undefined;
    note: string | undefined;
}) => (
    /* Label at the top and figure at the foot, as the year card has its
       chart: the row is as tall as that card, and this one fills it. */
    <section
        className={cardClass("flex flex-col justify-between gap-2 p-4", {
            padding: "none",
        })}
    >
        <CardLabel>{label}</CardLabel>
        <div className="flex flex-col gap-2">
            <p className={figureClass("stat", "truncate")}>
                {figure ?? (
                    <Skeleton className="inline-block h-[1em] w-20 align-top" />
                )}
            </p>
            <p className="truncate text-label-sm text-content-muted">
                {note ?? <Skeleton className="inline-block h-[1em] w-16" />}
            </p>
        </div>
    </section>
);

/** The profile at a glance: what spans every view, rather than any one of
 *  them. Two figures, and the year so far in played games. */
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
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2.2fr)] lg:gap-4">
            <FigureCard
                label="Hours played"
                figure={stats && formatHours(stats.hoursPlayed)}
                note={
                    stats &&
                    `Across ${plural(stats.gameCount, "game", "games")}`
                }
            />

            <FigureCard
                label="Average rating"
                figure={
                    stats && (
                        <RatingBadge value={stats.averageRating} size="stat" />
                    )
                }
                note={
                    stats &&
                    (stats.ratingCount > 0
                        ? `From ${plural(stats.ratingCount, "rating", "ratings")}`
                        : "Nothing rated yet")
                }
            />

            {/* The count says what the bars add up to, so the bars need no
                legend: each is a month's share of it. */}
            <section
                className={cardClass(
                    "col-span-2 flex flex-col gap-2 p-4 lg:col-span-1",
                    { padding: "none" }
                )}
            >
                <CardLabel>Played in {year}</CardLabel>
                <div className="flex items-end gap-4 sm:gap-6">
                    <div className="shrink-0">
                        <p className={figureClass("stat")}>
                            {yearLoading ? (
                                <Skeleton className="inline-block h-[1em] w-10 align-top" />
                            ) : (
                                formatCount(playedThisYear)
                            )}
                        </p>
                        <p className="mt-2 text-label-sm text-content-muted">
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
            </section>
        </div>
    );
};

export default OverviewView;
