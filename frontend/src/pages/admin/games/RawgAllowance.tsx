import { useState, type FormEvent } from "react";
import type { RawgUsage } from "@playrates/shared";
import { cardClass } from "../../../components/ui/Card";
import { figureClass } from "../../../components/ui/Figure";
import Button from "../../../components/ui/Button";
import Field from "../../../components/ui/Field";
import { NumberInput } from "../../../components/ui/Input";
import { Skeleton } from "../../../components/ui/Skeleton";
import { useNotify } from "../../../contexts/NotificationContext";
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

const projectedUse = (usage: RawgUsage) =>
    usage.used + usage.pace * usage.daysLeft;

/** The allowance as a meter, with when it resets and what a day can spend. */
export const AllowanceMeter = ({ usage }: { usage: RawgUsage }) => (
    <div className="flex flex-col gap-2.5">
        <Meter
            used={usage.used}
            total={usage.allowance}
            projected={projectedUse(usage)}
            tone={allowanceTone(usage)}
            label={`${formatCount(usage.used)} of ${formatCount(usage.allowance)} spent; at this pace ${formatCount(projectedUse(usage))} by the reset`}
        />
        <p className="text-label text-content-secondary">
            Resets {shortDate(usage.resetsOn)} ·{" "}
            <span className="font-mono text-content">
                {formatCount(usage.dailyBudget)}
            </span>{" "}
            a day to last
        </p>
        {usage.runsOutOn && (
            <p className="-mt-1.5 text-label text-danger">
                At <span className="font-mono">{formatCount(usage.pace)}</span>{" "}
                a day it runs out {shortDate(usage.runsOutOn)}
            </p>
        )}
    </div>
);

/** Requests counted each day this period, against a day's budget. */
export const AllowanceDays = ({
    usage,
    height = 104,
}: {
    usage: RawgUsage;
    height?: number;
}) => {
    const days = usage.days.filter((d) => d.day >= usage.periodStart);
    return (
        <div className="flex flex-col gap-2">
            <BarPlot
                bars={days.map((d) => ({
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
                label="RAWG requests each day, this period"
                height={height}
                // Always drawn, and the scale reaches it: against a day's budget a
                // quiet day looks quiet, where scaled to itself one request fills
                // the plot.
                marker={{ value: usage.dailyBudget, label: "a day’s budget" }}
                describe={(i) => {
                    const d = days[i]!;
                    return `${shortDate(d.day)}: ${d.requests} ${d.requests === 1 ? "request" : "requests"}${d.failures ? `, ${d.failures} failed` : ""}`;
                }}
                readout={(i) => {
                    const d = days[i]!;
                    return (
                        <span className="flex flex-wrap justify-between gap-x-3">
                            <span>
                                <span className="font-mono text-content">
                                    {formatCount(d.requests)}
                                </span>{" "}
                                {d.requests === 1 ? "request" : "requests"}{" "}
                                counted on {shortDate(d.day)}
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
                            {usage.lastRequestAt && (
                                <span className="text-content-muted">
                                    last {relativeTime(usage.lastRequestAt)}
                                </span>
                            )}
                        </span>
                    );
                }}
                axis={{ start: shortDate(days[0]?.day ?? ""), end: "today" }}
            />
            {usage.lastError && (
                <p className="text-label-sm text-danger">
                    Last failure {relativeTime(usage.lastFailureAt)}:{" "}
                    {usage.lastError}
                </p>
            )}
        </div>
    );
};

const CorrectForm = ({
    usage,
    onDone,
}: {
    usage: RawgUsage;
    onDone: () => void;
}) => {
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
                RAWG’s responses don’t say how much is left, so PlayRates counts
                every request it makes. Anything spent elsewhere is only caught
                by copying RAWG’s own figure in here.
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
            <Button
                type="submit"
                disabled={left === "" || correct.isPending}
                className="w-full sm:w-auto sm:self-end"
            >
                {correct.isPending ? "Saving…" : "Use this figure"}
            </Button>
        </form>
    );
};

/** Where the figure comes from, and a way to put RAWG's own in. */
export const AllowanceBasis = ({ usage }: { usage: RawgUsage }) => {
    const correcting = useSeeAll();
    return (
        <>
            <p className="text-label-sm text-content-muted">
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
            {correcting.open && (
                <SeeAllModal
                    title="Correct the RAWG count"
                    onClose={correcting.hide}
                >
                    <CorrectForm usage={usage} onDone={correcting.hide} />
                </SeeAllModal>
            )}
        </>
    );
};

/** The figure itself, over its allowance. */
export const AllowanceFigure = ({ usage }: { usage: RawgUsage }) => (
    <p className="flex items-baseline gap-1.5">
        <span className={figureClass("display")}>
            {formatCount(usage.left)}
        </span>
        <span className="font-mono text-body-sm text-content-muted">
            / {formatCount(usage.allowance)}
        </span>
    </p>
);

/**
 * What is left of RAWG's allowance, the figure that decides whether new games
 * can arrive, as the Games view shows it: the figure on the left, the days
 * that spent it on the right.
 */
const RawgAllowance = () => {
    const { data: usage } = useRawgUsage();
    if (!usage) return <Skeleton className="h-72 rounded-lg" />;

    return (
        <section
            aria-label="RAWG allowance"
            className={cardClass(
                "grid gap-6 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]",
                { padding: "none" }
            )}
        >
            <div className="flex flex-col gap-3 border-b border-subtle px-5 py-5 lg:border-r lg:border-b-0 lg:pr-6">
                <h2 className="text-label text-content-muted">
                    RAWG requests left
                </h2>
                <AllowanceFigure usage={usage} />
                <AllowanceMeter usage={usage} />
                <div className="mt-auto pt-2">
                    <AllowanceBasis usage={usage} />
                </div>
            </div>
            <div className="min-w-0 px-5 pb-5 lg:py-5 lg:pr-6 lg:pl-0">
                <AllowanceDays usage={usage} />
            </div>
        </section>
    );
};

export default RawgAllowance;
