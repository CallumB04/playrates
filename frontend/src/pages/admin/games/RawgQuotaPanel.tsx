import { TriangleAlert } from "lucide-react";
import Panel, { PanelCount } from "../../../components/ui/Panel";
import Progress from "../../../components/ui/Progress";
import { TextSkeleton } from "../../../components/ui/Skeleton";
import { cn } from "../../../lib/cn";
import { formatCount, relativeTime } from "../../../lib/format";
import { useRawgUsage } from "../../../hooks/queries/useAdmin";
import { StackedColumns, type Series } from "../charts/charts";
import { quotaLevel } from "./gamePresentation";

const FILL = { ok: "bg-brand", warning: "bg-warning", danger: "bg-danger" };

const SERIES: Series<"requests">[] = [
    { key: "requests", label: "Requests", color: "var(--color-chart-1)" },
];

/** The month's RAWG allowance, which live searches spend from as well. */
const RawgQuotaPanel = () => {
    const { data, isPending } = useRawgUsage();

    if (isPending || !data) {
        return (
            <Panel title="RAWG allowance">
                <TextSkeleton lines={3} />
            </Panel>
        );
    }

    const level = quotaLevel(data.monthRequests, data.allowance);
    const projectedLevel = quotaLevel(data.projected, data.allowance);
    const days = data.days.map((d) => ({ bucket: d.day, requests: d.requests }));

    return (
        <Panel
            title="RAWG allowance"
            trailing={
                <PanelCount
                    value={`${formatCount(data.monthRequests)} / ${formatCount(data.allowance)}`}
                />
            }
        >
            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                    <Progress
                        value={data.monthRequests / data.allowance}
                        label={`${formatCount(data.monthRequests)} of ${formatCount(data.allowance)} requests used this month`}
                        size="lg"
                        fillClassName={FILL[level]}
                    />
                    <p className="text-body-sm text-content-secondary">
                        {formatCount(data.allowance - data.monthRequests)} left this
                        month. At this rate the month ends near{" "}
                        <span
                            className={cn(
                                "font-mono tabular-nums",
                                projectedLevel === "ok" ? "text-content" : "font-semibold text-content"
                            )}
                        >
                            {formatCount(data.projected)}
                        </span>
                        .
                    </p>
                    {projectedLevel !== "ok" && (
                        <p
                            className={cn(
                                "flex items-start gap-2 rounded-md px-3 py-2 text-body-sm",
                                projectedLevel === "danger"
                                    ? "bg-danger-subtle text-danger-content"
                                    : "bg-warning-subtle text-warning-content"
                            )}
                        >
                            <TriangleAlert size={15} aria-hidden className="mt-0.5 shrink-0" />
                            {projectedLevel === "danger"
                                ? "On course to run out. When it does, search stops finding new games and imports fail."
                                : "On course to use most of the allowance. Keep manual pulls small."}
                        </p>
                    )}
                </div>

                <StackedColumns
                    data={days}
                    series={SERIES}
                    bucket="day"
                    caption="RAWG requests per day, last 30 days"
                    height={130}
                />

                <p className="text-label-sm text-content-muted">
                    Last call {relativeTime(data.lastRequestAt)}
                    {data.monthFailures > 0 &&
                        ` · ${formatCount(data.monthFailures)} failed this month`}
                    {data.lastError &&
                        ` · last failure ${relativeTime(data.lastFailureAt)}: ${data.lastError}`}
                </p>
            </div>
        </Panel>
    );
};

export default RawgQuotaPanel;
