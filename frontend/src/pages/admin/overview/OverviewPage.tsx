import { useState } from "react";
import {
    Gamepad2,
    Library,
    MessagesSquare,
    NotebookPen,
    UserRound,
    UsersRound,
} from "lucide-react";
import {
    ADMIN_RANGES,
    type AdminMetric,
    type AdminRange,
} from "@playrates/shared";
import Panel from "../../../components/ui/Panel";
import SegmentedChoice from "../../../components/ui/SegmentedChoice";
import EmptyPlate from "../../../components/ui/EmptyPlate";
import { Skeleton } from "../../../components/ui/Skeleton";
import { formatCount } from "../../../lib/format";
import { useAdminOverview } from "../../../hooks/queries/useAdmin";
import AdminPageHeader from "../components/AdminPageHeader";
import { StackedColumns, TrendChart, type Series } from "../charts/charts";
import DeltaChip from "../charts/DeltaChip";
import { RANGE_LABELS } from "../lib/adminFormat";
import KpiTile from "./KpiTile";
import MetricDetailModal from "./MetricDetailModal";

const ACTIVE_SERIES: Series<"active" | "activeWeek">[] = [
    { key: "activeWeek", label: "Active in the last 7 days", color: "var(--color-chart-2)" },
    { key: "active", label: "Active that day", color: "var(--color-chart-1)" },
];

const MADE_SERIES: Series<"logs" | "reviews" | "messages" | "threads">[] = [
    { key: "logs", label: "Game logs", color: "var(--color-chart-1)" },
    { key: "reviews", label: "Reviews", color: "var(--color-chart-2)" },
    { key: "messages", label: "Replies", color: "var(--color-chart-3)" },
    { key: "threads", label: "Threads", color: "var(--color-chart-4)" },
];

const SIGNUP_SERIES: Series<"signups">[] = [
    { key: "signups", label: "Sign-ups", color: "var(--color-chart-1)" },
];

const OverviewPage = () => {
    const [range, setRange] = useState<AdminRange>("30d");
    const [open, setOpen] = useState<AdminMetric | null>(null);
    const { data, isPending, isError, isPlaceholderData } = useAdminOverview(range);

    const rangeLabel = RANGE_LABELS[range];
    const series = data?.series ?? [];
    const pick = (key: "signups" | "logs" | "reviews" | "messages" | "active") =>
        series.map((p) => p[key]);

    return (
        <>
            <AdminPageHeader
                title="Overview"
                description="Everyone's activity across PlayRates. Days are UTC."
                actions={
                    <SegmentedChoice
                        label="Period"
                        value={range}
                        onChange={setRange}
                        segments={ADMIN_RANGES.map((value) => ({
                            value,
                            label: value.toUpperCase(),
                        }))}
                    />
                }
            />

            {isError && (
                <EmptyPlate
                    title="The numbers didn't load"
                    body="The API or the database may be down. The Health view says which."
                />
            )}

            {isPending && (
                <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-3">
                    {Array.from({ length: 6 }, (_, i) => (
                        <Skeleton key={i} className="h-36 rounded-lg" />
                    ))}
                </div>
            )}

            {data && (
                <div className="flex flex-col gap-6">
                    <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-3">
                        <KpiTile
                            label="Users"
                            icon={UsersRound}
                            value={data.totals.users}
                            period={{
                                figure: data.period.signups,
                                text: `${formatCount(data.period.signups.current)} new in ${rangeLabel}`,
                            }}
                            trend={pick("signups")}
                            footnote={`${formatCount(data.totals.onboarded)} through the welcome`}
                            onOpen={() => setOpen("users")}
                        />
                        <KpiTile
                            label="Active this week"
                            icon={UserRound}
                            value={data.totals.wau}
                            period={{
                                figure: data.activeWeek,
                                text: `against ${formatCount(data.activeWeek.previous)} a week before`,
                            }}
                            trend={pick("active")}
                            footnote={`${formatCount(data.totals.dau)} today · ${formatCount(data.totals.mau)} this month · ${formatCount(data.totals.online)} online now`}
                            onOpen={() => setOpen("users")}
                        />
                        <KpiTile
                            label="Game logs"
                            icon={NotebookPen}
                            value={data.totals.logs}
                            period={{
                                figure: data.period.logs,
                                text: `${formatCount(data.period.logs.current)} added in ${rangeLabel}`,
                            }}
                            trend={pick("logs")}
                            onOpen={() => setOpen("logs")}
                        />
                        <KpiTile
                            label="Reviews"
                            icon={Library}
                            value={data.totals.reviews}
                            period={{
                                figure: data.period.reviews,
                                text: `${formatCount(data.period.reviews.current)} written in ${rangeLabel}`,
                            }}
                            trend={pick("reviews")}
                            onOpen={() => setOpen("reviews")}
                        />
                        <KpiTile
                            label="Community replies"
                            icon={MessagesSquare}
                            value={data.totals.messages}
                            period={{
                                figure: data.period.messages,
                                text: `${formatCount(data.period.messages.current)} posted in ${rangeLabel}`,
                            }}
                            trend={pick("messages")}
                            footnote={`${formatCount(data.totals.threads)} threads · ${formatCount(data.period.threads.current)} new in ${rangeLabel}`}
                            onOpen={() => setOpen("community")}
                        />
                        <KpiTile
                            label="Games in the catalogue"
                            icon={Gamepad2}
                            value={data.totals.games}
                            footnote={`${formatCount(data.totals.friendships)} friendships between players`}
                            onOpen={() => setOpen("games")}
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                        <Panel title="Who's around">
                            <TrendChart
                                data={series}
                                series={ACTIVE_SERIES}
                                bucket={data.bucket}
                                caption={`People active per ${data.bucket}, over ${rangeLabel}`}
                                stale={isPlaceholderData}
                            />
                        </Panel>
                        <Panel title="What people made">
                            <StackedColumns
                                data={series}
                                series={MADE_SERIES}
                                bucket={data.bucket}
                                caption={`Logs, reviews, replies and threads per ${data.bucket}, over ${rangeLabel}`}
                                stale={isPlaceholderData}
                            />
                        </Panel>
                    </div>

                    <Panel
                        title="Sign-ups"
                        trailing={<DeltaChip figure={data.period.signups} />}
                    >
                        <StackedColumns
                            data={series}
                            series={SIGNUP_SERIES}
                            bucket={data.bucket}
                            caption={`New accounts per ${data.bucket}, over ${rangeLabel}`}
                            height={160}
                            stale={isPlaceholderData}
                        />
                    </Panel>
                </div>
            )}

            {open && (
                <MetricDetailModal
                    metric={open}
                    range={range}
                    overview={data}
                    onClose={() => setOpen(null)}
                />
            )}
        </>
    );
};

export default OverviewPage;
