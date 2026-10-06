import type { IgdbUsage as Usage } from "@playrates/shared";
import { cardClass } from "../../../components/ui/Card";
import { figureClass } from "../../../components/ui/Figure";
import { Skeleton } from "../../../components/ui/Skeleton";
import { formatCount, relativeTime } from "../../../lib/format";
import { useIgdbUsage } from "../../../hooks/queries/useAdmin";
import BarPlot from "../components/BarPlot";
import { bucketLabel } from "../lib/adminFormat";

/** "8 Oct". The days are UTC, read as such. */
const shortDate = (day: string) => bucketLabel(day, "day");

/** Today's count, and how many failed. */
export const UsageFigure = ({ usage }: { usage: Usage }) => (
    <div className="flex flex-col gap-1.5">
        <p className={figureClass("display")}>
            {formatCount(usage.todayRequests)}
        </p>
        <p className="text-label text-content-secondary">
            {usage.todayFailures > 0 ? (
                <span className="text-danger">
                    <span className="font-mono">{usage.todayFailures}</span>{" "}
                    failed today
                </span>
            ) : (
                "None failed today"
            )}
            {usage.lastRequestAt &&
                ` · last ${relativeTime(usage.lastRequestAt)}`}
        </p>
    </div>
);

/** Requests each day for the last thirty, failures in red. */
export const UsageDays = ({
    usage,
    height = 104,
}: {
    usage: Usage;
    height?: number;
}) => (
    <div className="flex flex-col gap-2">
        <BarPlot
            bars={usage.days.map((d) => ({
                key: d.day,
                segments: [
                    {
                        key: "ok",
                        value: d.requests - d.failures,
                        className: "bg-brand",
                    },
                    {
                        key: "failed",
                        value: d.failures,
                        className: "bg-danger",
                    },
                ],
            }))}
            label="IGDB requests each day, last 30 days"
            height={height}
            describe={(i) => {
                const d = usage.days[i]!;
                return `${shortDate(d.day)}: ${d.requests} ${d.requests === 1 ? "request" : "requests"}${d.failures ? `, ${d.failures} failed` : ""}`;
            }}
            readout={(i) => {
                const d = usage.days[i]!;
                return (
                    <span>
                        <span className="font-mono text-content">
                            {formatCount(d.requests)}
                        </span>{" "}
                        {d.requests === 1 ? "request" : "requests"} on{" "}
                        {shortDate(d.day)}
                        {d.failures > 0 && (
                            <span className="text-danger">
                                {" · "}
                                <span className="font-mono">
                                    {d.failures}
                                </span>{" "}
                                failed
                            </span>
                        )}
                    </span>
                );
            }}
            axis={{
                start: shortDate(usage.days[0]?.day ?? ""),
                end: "today",
            }}
        />
        {usage.lastError && (
            <p className="text-label-sm text-danger">
                Last failure {relativeTime(usage.lastFailureAt)}:{" "}
                {usage.lastError}
            </p>
        )}
    </div>
);

/**
 * How much the site is asking of IGDB. There is no allowance to run down,
 * only a rate, so this is for spotting failures rather than budgeting.
 */
const IgdbUsage = () => {
    const { data: usage } = useIgdbUsage();
    if (!usage) return <Skeleton className="h-56 rounded-lg" />;

    return (
        <section
            aria-label="IGDB requests"
            className={cardClass(
                "grid gap-6 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]",
                { padding: "none" }
            )}
        >
            <div className="flex flex-col gap-3 border-b border-subtle px-5 py-5 lg:border-r lg:border-b-0 lg:pr-6">
                <h2 className="text-label text-content-muted">
                    IGDB requests today
                </h2>
                <UsageFigure usage={usage} />
            </div>
            <div className="min-w-0 px-5 pb-5 lg:py-5 lg:pr-6 lg:pl-0">
                <UsageDays usage={usage} />
            </div>
        </section>
    );
};

export default IgdbUsage;
