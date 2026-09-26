import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import type { RawgUsage } from "@playrates/shared";
import { cardClass } from "../../../components/ui/Card";
import { figureClass } from "../../../components/ui/Figure";
import Button from "../../../components/ui/Button";
import Field from "../../../components/ui/Field";
import { NumberInput } from "../../../components/ui/Input";
import { Skeleton } from "../../../components/ui/Skeleton";
import { useNotify } from "../../../contexts/NotificationContext";
import { cn } from "../../../lib/cn";
import { formatCount, relativeTime } from "../../../lib/format";
import { useCorrectRawg, useRawgUsage } from "../../../hooks/queries/useAdmin";
import BarPlot from "../components/BarPlot";
import Meter from "../components/Meter";
import { SeeAllModal } from "../components/SeeAll";
import { useSeeAll } from "../components/useSeeAll";
import { bucketLabel } from "../lib/adminFormat";
import { allowanceTone } from "./gamePresentation";

/** "8 Oct". The period's dates are UTC days, read as such. */
const shortDate = (day: string) => bucketLabel(day, "day");

const Correct = ({ usage, onDone }: { usage: RawgUsage; onDone: () => void }) => {
    const [left, setLeft] = useState("");
    const correct = useCorrectRawg();
    const notify = useNotify();

    const submit = (e: FormEvent) => {
        e.preventDefault();
        const n = Number(left);
        if (!Number.isInteger(n) || n < 0) return;
        correct.mutate(n, {
            onSuccess: () => {
                notify("Counting on from RAWG’s figure", "success");
                onDone();
            },
            onError: () => notify("That didn’t save", "error"),
        });
    };

    return (
        <form onSubmit={submit} className="flex flex-col gap-4">
            <p className="text-body-sm text-content-secondary">
                RAWG’s responses don’t say how much is left, so PlayRates counts every request
                it makes. Anything spent elsewhere, or before counting began, is only caught by
                copying RAWG’s own figure in here.
            </p>
            <Field label="Requests left, as RAWG’s dashboard shows it">
                {(a11y) => (
                    <NumberInput
                        {...a11y}
                        value={left}
                        onChange={(e) => setLeft(e.target.value)}
                        min={0}
                        step={1}
                        inputMode="numeric"
                        placeholder={String(usage.left)}
                        autoFocus
                    />
                )}
            </Field>
            <Button type="submit" disabled={left === "" || correct.isPending} className="w-full sm:w-auto sm:self-end">
                {correct.isPending ? "Saving…" : "Use this figure"}
            </Button>
        </form>
    );
};

/**
 * What is left of RAWG's allowance, the figure that decides whether new games
 * can arrive. The meter's fill is spent, its ember tick where this pace ends
 * up by the reset.
 */
const RawgAllowance = ({ compact = false }: { compact?: boolean }) => {
    const { data: usage } = useRawgUsage();
    const correcting = useSeeAll();

    if (!usage) return <Skeleton className={cn("rounded-lg", compact ? "h-44" : "h-72")} />;

    const tone = allowanceTone(usage);
    const heading = (
        <>
            <h2 className="text-label text-content-muted">RAWG requests left</h2>
            <p className="mt-2 flex items-baseline gap-1.5">
                <span className={figureClass(compact ? "lg" : "display")}>{formatCount(usage.left)}</span>
                <span className="font-mono text-body-sm text-content-muted">/ {formatCount(usage.allowance)}</span>
            </p>
            <Meter
                className="mt-3"
                used={usage.used}
                total={usage.allowance}
                projected={usage.used + usage.pace * usage.daysLeft}
                tone={tone}
                label={`${formatCount(usage.used)} of ${formatCount(usage.allowance)} spent; at this pace ${formatCount(usage.used + usage.pace * usage.daysLeft)} by the reset`}
            />
            <p className="mt-3 text-label text-content-secondary">
                Resets {shortDate(usage.resetsOn)} ·{" "}
                <span className="font-mono text-content">{formatCount(usage.dailyBudget)}</span> a day to last
            </p>
            {usage.runsOutOn && (
                <p className="mt-1 text-label text-danger">
                    At <span className="font-mono">{formatCount(usage.pace)}</span> a day it runs out{" "}
                    {shortDate(usage.runsOutOn)}
                </p>
            )}
        </>
    );

    if (compact) {
        return (
            <Link
                to="/admin/games"
                className={cardClass("block lift hover:-translate-y-px hover:shadow-lifted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand")}
            >
                {heading}
            </Link>
        );
    }

    return (
        <section aria-label="RAWG allowance" className={cardClass("grid gap-6 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]", { padding: "none" })}>
            <div className="flex flex-col border-b border-subtle px-5 py-5 lg:border-r lg:border-b-0 lg:pr-6">
                {heading}
                <p className="mt-auto pt-4 text-label-sm text-content-muted">
                    {usage.basis === "corrected"
                        ? `From RAWG’s figure on ${shortDate(usage.since!)}, plus every request since`
                        : "Counted by PlayRates alone, so it may be missing some"}
                    {" · "}
                    <button
                        type="button"
                        onClick={correcting.show}
                        className="relative cursor-pointer font-medium text-brand before:absolute before:-inset-x-1 before:-inset-y-3 before:content-[''] hover:underline sm:before:hidden"
                    >
                        Correct it
                    </button>
                </p>
            </div>

            <div className="flex min-w-0 flex-col gap-3 px-5 pb-5 lg:py-5 lg:pr-6 lg:pl-0">
                <BarPlot
                    bars={usage.days.map((d) => ({
                        key: d.day,
                        segments: [
                            { key: "ok", value: d.requests - d.failures, className: "bg-brand" },
                            { key: "failed", value: d.failures, className: "bg-danger" },
                        ],
                    }))}
                    label="RAWG requests each day, last 30 days"
                    height={104}
                    marker={
                        Math.max(...usage.days.map((d) => d.requests)) >= usage.dailyBudget / 4
                            ? { value: usage.dailyBudget, label: "a day’s budget" }
                            : undefined
                    }
                    describe={(i) => {
                        const d = usage.days[i]!;
                        return `${shortDate(d.day)}: ${d.requests} ${d.requests === 1 ? "request" : "requests"}${d.failures ? `, ${d.failures} failed` : ""}`;
                    }}
                    readout={(i) => {
                        const d = usage.days[i]!;
                        return (
                            <span className="flex flex-wrap justify-between gap-x-3">
                                <span>
                                    <span className="font-mono text-content">{formatCount(d.requests)}</span>{" "}
                                    {d.requests === 1 ? "request" : "requests"} counted on {shortDate(d.day)}
                                    {d.failures > 0 && (
                                        <span className="text-danger">
                                            {" · "}
                                            <span className="font-mono">{d.failures}</span> failed
                                        </span>
                                    )}
                                </span>
                                {usage.lastRequestAt && <span className="text-content-muted">last {relativeTime(usage.lastRequestAt)}</span>}
                            </span>
                        );
                    }}
                    axis={{ start: shortDate(usage.days[0]?.day ?? ""), end: "today" }}
                />
                {usage.lastError && (
                    <p className="text-label-sm text-danger">
                        Last failure {relativeTime(usage.lastFailureAt)}: {usage.lastError}
                    </p>
                )}
            </div>

            {correcting.open && (
                <SeeAllModal title="Correct the RAWG count" onClose={correcting.hide}>
                    <Correct usage={usage} onDone={correcting.hide} />
                </SeeAllModal>
            )}
        </section>
    );
};

export default RawgAllowance;
