import { TriangleAlert } from "lucide-react";
import { cardClass } from "../../../components/ui/Card";
import { figureClass } from "../../../components/ui/Figure";
import Progress from "../../../components/ui/Progress";
import { TextSkeleton } from "../../../components/ui/Skeleton";
import { cn } from "../../../lib/cn";
import { formatCount, relativeTime } from "../../../lib/format";
import { useRawgUsage } from "../../../hooks/queries/useAdmin";
import BarPlot from "../components/BarPlot";
import { bucketLabel } from "../lib/adminFormat";
import { quotaLevel } from "./gamePresentation";

const FILL = { ok: "bg-brand", warning: "bg-warning", danger: "bg-danger" };

const daysInMonth = (now: Date) =>
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();

/**
 * The month's RAWG allowance, as the game page draws a rating: the figure
 * that matters on the left, the days that made it on the right. Live
 * searches spend from it too, so it moves without anyone pressing anything.
 */
const RawgQuotaPanel = () => {
    const { data, isPending } = useRawgUsage();

    if (isPending || !data) {
        return (
            <div className={cardClass()}>
                <TextSkeleton lines={4} />
            </div>
        );
    }

    const level = quotaLevel(data.monthRequests, data.allowance);
    const heading = quotaLevel(data.projected, data.allowance);
    const dailyShare = Math.round(data.allowance / daysInMonth(new Date()));
    const peak = Math.max(0, ...data.days.map((d) => d.requests));
    // A marker far above every bar flattens them to nothing; it only earns a
    // place once a day comes near its share.
    const marker = peak >= dailyShare / 4 ? { value: dailyShare, label: "a day’s share" } : undefined;

    return (
        <section aria-label="RAWG allowance" className={cardClass("grid gap-6 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]", { padding: "none" })}>
            <div className="flex flex-col gap-3 border-b border-subtle px-5 py-5 lg:border-r lg:border-b-0 lg:pr-6">
                <h2 className="text-label text-content-muted">RAWG this month</h2>
                <p className="flex items-baseline gap-1">
                    <span className={figureClass("display")}>{formatCount(data.monthRequests)}</span>
                    <span className="font-mono text-body-sm text-content-muted">
                        / {formatCount(data.allowance)}
                    </span>
                </p>
                <Progress
                    value={data.monthRequests / data.allowance}
                    label={`${formatCount(data.monthRequests)} of ${formatCount(data.allowance)} requests used`}
                    fillClassName={FILL[level]}
                />
                <p className="text-body-sm text-content-secondary">
                    On course for{" "}
                    <span className={cn("font-mono", heading === "ok" ? "text-content" : "font-semibold text-warning")}>
                        {formatCount(data.projected)}
                    </span>{" "}
                    by the month’s end.
                </p>
                <p className="text-label-sm text-content-muted">
                    {data.lastRequestAt ? `Last asked ${relativeTime(data.lastRequestAt)}` : "Not asked yet this month"}
                    {data.monthFailures > 0 && (
                        <>
                            {" · "}
                            <span className="text-danger">{formatCount(data.monthFailures)} failed</span>
                        </>
                    )}
                </p>
            </div>

            <div className="flex min-w-0 flex-col gap-4 px-5 pb-5 lg:py-5 lg:pr-6 lg:pl-0">
                <BarPlot
                    bars={data.days.map((d) => ({
                        key: d.day,
                        segments: [
                            { key: "ok", value: d.requests - d.failures, className: "bg-brand" },
                            { key: "failed", value: d.failures, className: "bg-danger" },
                        ],
                    }))}
                    label="RAWG requests each day, last 30 days"
                    height={104}
                    marker={marker}
                    describe={(i) => {
                        const d = data.days[i]!;
                        return `${bucketLabel(d.day, "day")}: ${d.requests} ${d.requests === 1 ? "request" : "requests"}${d.failures ? `, ${d.failures} failed` : ""}`;
                    }}
                    readout={(i) => {
                        const d = data.days[i]!;
                        return (
                            <span className="flex flex-wrap justify-between gap-x-3">
                                <span>
                                    <span className="font-mono text-content">{formatCount(d.requests)}</span>{" "}
                                    {d.requests === 1 ? "request" : "requests"} on {bucketLabel(d.day, "day")}
                                    {d.failures > 0 && (
                                        <span className="text-danger">
                                            {" · "}
                                            <span className="font-mono">{d.failures}</span> failed
                                        </span>
                                    )}
                                </span>
                                <span className="text-content-muted">
                                    a day’s share is <span className="font-mono">{formatCount(dailyShare)}</span>
                                </span>
                            </span>
                        );
                    }}
                    axis={{ start: bucketLabel(data.days[0]?.day ?? "", "day"), end: "today" }}
                />

                {heading !== "ok" && (
                    <p
                        className={cn(
                            "flex items-start gap-2 rounded-md px-3 py-2.5 text-body-sm",
                            heading === "danger" ? "bg-danger-subtle text-danger-content" : "bg-warning-subtle text-warning-content"
                        )}
                    >
                        <TriangleAlert size={15} aria-hidden className="mt-0.5 shrink-0" />
                        {heading === "danger"
                            ? "This runs out before the month does. When it goes, search stops finding new games and every import fails."
                            : "This will use most of the month’s allowance. Keep pulls to a page."}
                    </p>
                )}
                {data.lastError && (
                    <p className="text-label-sm text-content-muted">
                        Last failure {relativeTime(data.lastFailureAt)}: {data.lastError}
                    </p>
                )}
            </div>
        </section>
    );
};

export default RawgQuotaPanel;
