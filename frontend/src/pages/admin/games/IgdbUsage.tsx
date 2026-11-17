import type { IgdbUsage as Usage } from "@playrates/shared";
import Button from "../../../components/ui/Button";
import { figureClass } from "../../../components/ui/figureClass";
import { formatCount, relativeTime } from "../../../lib/format";
import { useIgdbUsage } from "../../../hooks/queries/useAdmin";
import BarPlot from "../components/BarPlot";
import { SeeAllModal } from "../components/SeeAll";
import { useSeeAll } from "../components/useSeeAll";
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
 * Today's requests to IGDB on a button, the last thirty days behind it.
 * There is no allowance to run down, only a rate, so this is for spotting
 * failures rather than budgeting.
 */
const IgdbUsage = () => {
    const { data: usage } = useIgdbUsage();
    const days = useSeeAll();
    return (
        <>
            <Button
                variant="secondary"
                onClick={days.show}
                aria-haspopup="dialog"
                disabled={!usage}
                className="w-full sm:w-auto"
            >
                IGDB today:{" "}
                <span className="font-mono">
                    {usage ? formatCount(usage.todayRequests) : "…"}
                </span>
                {usage && usage.todayFailures > 0 && (
                    <span className="text-danger">
                        , {formatCount(usage.todayFailures)} failed
                    </span>
                )}
            </Button>
            {days.open && usage && (
                <SeeAllModal title="IGDB requests" onClose={days.hide}>
                    <div className="flex flex-col gap-6">
                        <UsageFigure usage={usage} />
                        <UsageDays usage={usage} height={140} />
                    </div>
                </SeeAllModal>
            )}
        </>
    );
};

export default IgdbUsage;
