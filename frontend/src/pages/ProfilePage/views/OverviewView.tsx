import type { UserStats } from "@playrates/shared";
import { cardClass } from "../../../components/ui/Card";
import Stat from "../../../components/ui/Stat";
import Progress from "../../../components/ui/Progress";
import RatingBadge from "../../../components/ui/RatingBadge";
import {
    GAME_STATUSES,
    STATUS_PRESENTATION,
    type GameStatus,
} from "../../../constants/gameStatus";
import { formatCount, formatHours } from "../../../lib/format";
import { cn } from "../../../lib/cn";

/** The split of a shelf across the four states, as one stacked bar. */
const ShelfBar = ({
    byStatus,
    total,
}: {
    byStatus: Partial<Record<GameStatus, number>>;
    total: number;
}) => {
    if (total === 0) return null;

    return (
        <div>
            <Progress
                size="lg"
                label={GAME_STATUSES.map(
                    (status) =>
                        `${STATUS_PRESENTATION[status].label}: ${byStatus[status] ?? 0}`
                ).join(", ")}
                segments={GAME_STATUSES.map((status) => {
                    const count = byStatus[status] ?? 0;
                    return {
                        key: status,
                        value: count / total,
                        className: STATUS_PRESENTATION[status].accent,
                        title: `${STATUS_PRESENTATION[status].label}: ${count}`,
                    };
                })}
            />

            <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
                {GAME_STATUSES.map((status) => {
                    const { label, accent } = STATUS_PRESENTATION[status];
                    return (
                        <span
                            key={status}
                            className="flex items-center gap-1.5 text-label-sm text-content-muted"
                        >
                            <span
                                aria-hidden
                                className={cn("size-2 rounded-full", accent)}
                            />
                            {label}
                            <span className="font-mono text-content">
                                {formatCount(byStatus[status] ?? 0)}
                            </span>
                        </span>
                    );
                })}
            </div>
        </div>
    );
};

/** The profile at a glance. Reviews, threads and friends each have a view
 *  of their own, so this keeps to what spans all of them. */
const OverviewView = ({ stats }: { stats: UserStats | undefined }) => {
    const byStatus = stats?.byStatus ?? {};
    const shelfTotal = GAME_STATUSES.reduce(
        (sum, status) => sum + (byStatus[status] ?? 0),
        0
    );

    return (
        <section
            className={cardClass(
                "grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center lg:gap-8"
            )}
        >
            <div className="grid grid-cols-2 gap-x-7 gap-y-4 sm:flex sm:flex-wrap">
                <Stat
                    label="Hours played"
                    loading={!stats}
                    value={formatHours(stats?.hoursPlayed)}
                />
                <Stat
                    label="Average rating"
                    loading={!stats}
                    value={
                        <RatingBadge
                            value={stats?.averageRating ?? null}
                            size="md"
                        />
                    }
                />
            </div>

            <ShelfBar byStatus={byStatus} total={shelfTotal} />
        </section>
    );
};

export default OverviewView;
