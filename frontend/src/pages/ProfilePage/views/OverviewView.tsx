import { useMemo, type ReactNode } from "react";
import { Clock, Star } from "lucide-react";
import type { UserStats } from "@playrates/shared";
import { latestRun } from "../../../api";
import { useUserShelf } from "../../../hooks/queries/useGameLogs";
import { cardClass } from "../../../components/ui/Card";
import Stat from "../../../components/ui/Stat";
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

/** A figure, and a line under it saying what it is made of. */
const FigureCard = ({
    children,
    note,
}: {
    children: ReactNode;
    note: string | undefined;
}) => (
    <section className={cardClass("flex flex-col justify-between gap-3")}>
        {children}
        <p className="text-label-sm text-content-muted">
            {note ?? <Skeleton className="inline-block h-[1em] w-20" />}
        </p>
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

    return (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2.6fr)] lg:gap-4">
            <FigureCard
                note={
                    stats &&
                    `Across ${plural(stats.gameCount, "game", "games")}`
                }
            >
                <Stat
                    icon={Clock}
                    label="Hours played"
                    loading={!stats}
                    value={formatHours(stats?.hoursPlayed)}
                />
            </FigureCard>

            <FigureCard
                note={
                    stats &&
                    (stats.ratingCount > 0
                        ? `From ${plural(stats.ratingCount, "rating", "ratings")}`
                        : "Nothing rated yet")
                }
            >
                <Stat
                    icon={Star}
                    label="Average rating"
                    loading={!stats}
                    value={
                        <RatingBadge
                            value={stats?.averageRating ?? null}
                            size="md"
                        />
                    }
                />
            </FigureCard>

            <section
                // Under both figures on a phone; beside them from lg.
                className={cardClass(
                    "col-span-2 flex flex-col gap-3 lg:col-span-1"
                )}
            >
                <header className="flex items-baseline justify-between gap-3">
                    <h2 className="font-display text-base font-semibold text-content">
                        {year} so far
                    </h2>
                    {!isLoading && canSee && (
                        <span className="text-label-sm text-content-muted">
                            {plural(playedThisYear, "game", "games")} played
                        </span>
                    )}
                </header>
                {isLoading || !canSee ? (
                    <Skeleton className="h-24 w-full rounded-xs" />
                ) : (
                    <YearChart
                        logs={yearLogs}
                        barsClassName="h-24"
                        emptyNote={
                            isOwner
                                ? "Games you finish this year chart here."
                                : "Nothing played yet this year."
                        }
                    />
                )}
            </section>
        </div>
    );
};

export default OverviewView;
