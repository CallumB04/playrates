import { useMemo } from "react";
import { latestRun } from "../../../api";
import { useUserShelf } from "../../../hooks/queries/useGameLogs";
import { cardClass } from "../../../components/ui/Card";
import { figureClass } from "../../../components/ui/Figure";
import { Skeleton } from "../../../components/ui/Skeleton";
import YearChart from "../../../components/gamelog/YearChart";
import { formatCount } from "../../../lib/format";

interface OverviewViewProps {
    username: string;
    isOwner: boolean;
    canSee: boolean;
}

/** The profile at a glance: the year so far in played games. Their hours
 *  and rating sit in the header, where every view shows them. */
const OverviewView = ({ username, isOwner, canSee }: OverviewViewProps) => {
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
    const loading = isLoading || !canSee;

    return (
        <section className={cardClass()}>
            <h2 className="text-label-sm text-content-muted">
                Played in {year}
            </h2>
            {/* The count says what the bars add up to, so they need no
                legend: each is a month's share of it. */}
            <div className="mt-1.5 flex items-end gap-4 sm:gap-6">
                <div className="shrink-0">
                    <p className={figureClass("lg")}>
                        {loading ? (
                            <Skeleton className="inline-block h-[1em] w-8 align-top" />
                        ) : (
                            formatCount(playedThisYear)
                        )}
                    </p>
                    <p className="mt-1 text-label-sm text-content-muted">
                        {playedThisYear === 1 ? "game" : "games"}
                    </p>
                </div>
                <div className="min-w-0 flex-1">
                    {loading ? (
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
    );
};

export default OverviewView;
