import type {
    AdminPeriodFigure,
    AdminRange,
    AdminReturn,
    AdminStaying,
} from "@playrates/shared";
import type { ReactNode } from "react";
import { cardClass } from "../../../components/ui/cardClass";
import { EmptyNote } from "../../../components/ui/EmptyPlate";
import { Skeleton } from "../../../components/ui/Skeleton";
import { useAdminStaying } from "../../../hooks/queries/useAdmin";
import { cn } from "../../../lib/cn";
import { formatCount } from "../../../lib/format";
import { RANGE_LABELS } from "../lib/adminFormat";
import { pointsChange, rate, reachedCurve } from "../lib/staying";
import LinePlot from "../components/LinePlot";
import SectionHeader from "../components/SectionHeader";
import { Change } from "./Change";

const countChange = (current: number, previous: number): AdminPeriodFigure => ({
    current,
    previous,
    change:
        previous === 0
            ? current === 0
                ? 0
                : null
            : (current - previous) / previous,
});

const Figure = ({
    label,
    value,
    detail,
    note,
}: {
    label: string;
    value: string;
    detail?: string;
    note: ReactNode;
}) => (
    <li className="flex min-w-0 flex-col gap-1">
        <span className="text-label text-content-secondary">{label}</span>
        <span className="font-display text-title text-content">{value}</span>
        {detail && (
            <span className="font-mono text-label-sm text-content-muted">
                {detail}
            </span>
        )}
        <span className="text-label-sm text-content-muted">{note}</span>
    </li>
);

/** A share of the period's signups, and its move on the period before in
 *  points, coloured, with the words in body ink beside it. */
const RateFigure = ({
    label,
    current,
    previous,
    period,
}: {
    label: string;
    current: AdminReturn;
    previous: AdminReturn;
    period: string;
}) => {
    const value = rate(current);
    const change = pointsChange(current, previous, period);
    return (
        <Figure
            label={label}
            value={value === null ? "–" : `${value}%`}
            detail={
                current.of === 0
                    ? "Too soon to tell"
                    : `${formatCount(current.back)} of ${formatCount(current.of)}`
            }
            note={
                change.figure ? (
                    <>
                        <span
                            className={cn(
                                "font-mono",
                                change.tone === "up"
                                    ? "text-success"
                                    : "text-danger"
                            )}
                        >
                            {change.figure}
                        </span>{" "}
                        {change.words}
                    </>
                ) : (
                    change.words
                )
            }
        />
    );
};

const Figures = ({ data, period }: { data: AdminStaying; period: string }) => {
    const { current, previous } = data;
    const of = (n: AdminStaying["current"], back: number): AdminReturn => ({
        back,
        of: n.joined,
    });
    return (
        <ol
            className={cardClass(
                "grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-5"
            )}
        >
            <Figure
                label="Joined"
                value={formatCount(current.joined)}
                note={
                    <Change
                        figure={countChange(current.joined, previous.joined)}
                        previous={period}
                    />
                }
            />
            <RateFigure
                label="Got started"
                current={of(current, current.onboarded)}
                previous={of(previous, previous.onboarded)}
                period={period}
            />
            <RateFigure
                label="Logged 3 on day one"
                current={of(current, current.loggedThree)}
                previous={of(previous, previous.loggedThree)}
                period={period}
            />
            <RateFigure
                label="Back after a week"
                current={current.backWeek}
                previous={previous.backWeek}
                period={period}
            />
            <RateFigure
                label="Back after a month"
                current={current.backMonth}
                previous={previous.backMonth}
                period={period}
            />
        </ol>
    );
};

const percentOf = (r: AdminReturn) => rate(r) ?? 0;

/** Of the period's signups, the share still coming back each day after
 *  joining: one shape to read, however long the period. */
const Curve = ({ data }: { data: AdminStaying }) => {
    const curve = reachedCurve(data.curve);
    const withInvited = data.invited.joined > 0;
    if (curve.length === 0) {
        return (
            <EmptyNote>
                No one who joined is a day along yet, so there’s no curve.
            </EmptyNote>
        );
    }
    const words = (i: number) => {
        const point = curve[i]!;
        const { back, of } = point.everyone;
        const invited = rate(point.invited);
        return `Day ${point.day}: ${rate(point.everyone) ?? 0}% still coming back, ${formatCount(back)} of ${formatCount(of)}${
            withInvited && invited !== null
                ? `. Through an invite, ${invited}%`
                : ""
        }`;
    };
    return (
        <section className={cardClass("flex flex-col gap-3")}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h3 className="text-label text-content-secondary">
                    Still coming back, by days since joining
                </h3>
                {withInvited && (
                    <span className="flex items-center gap-3 text-label-sm text-content-muted">
                        <span className="flex items-center gap-1.5">
                            <span
                                aria-hidden
                                className="h-0.5 w-3 rounded-full bg-brand"
                            />
                            Everyone
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span
                                aria-hidden
                                className="h-0.5 w-3 rounded-full bg-content-muted"
                            />
                            Through an invite
                        </span>
                    </span>
                )}
            </div>
            <LinePlot
                series={[
                    {
                        key: "everyone",
                        label: "Everyone",
                        values: curve.map((p) => percentOf(p.everyone)),
                        color: "var(--color-brand)",
                    },
                    ...(withInvited
                        ? [
                              {
                                  key: "invited",
                                  label: "Through an invite",
                                  values: curve.map((p) =>
                                      percentOf(p.invited)
                                  ),
                                  color: "var(--color-content-muted)",
                                  quiet: true,
                              },
                          ]
                        : []),
                ]}
                ceiling={100}
                height={160}
                label="Share of the people who joined still coming back, each day after joining"
                describe={words}
                axis={{
                    start: "Day 1",
                    end: `Day ${curve[curve.length - 1]!.day}`,
                }}
            />
        </section>
    );
};

/** Whether the people who join keep coming, over the page's period. */
const Staying = ({ range }: { range: AdminRange }) => {
    const { data, isPending, isError, isPlaceholderData } =
        useAdminStaying(range);
    const period = RANGE_LABELS[range];
    return (
        <section className="flex flex-col gap-4">
            <SectionHeader
                title="Do people stay"
                note={`The people who joined in the last ${period}`}
                className="mb-0"
            />
            {isPending ? (
                <Skeleton className="h-96 rounded-lg" />
            ) : isError || !data ? (
                <EmptyNote>These didn’t load. Health says why.</EmptyNote>
            ) : data.current.joined === 0 ? (
                <EmptyNote>No one joined in the last {period}.</EmptyNote>
            ) : (
                <div
                    className={cn(
                        "flex flex-col gap-4 transition-opacity",
                        isPlaceholderData && "opacity-60"
                    )}
                >
                    <Figures data={data} period={period} />
                    <Curve data={data} />
                    <p className="text-label-sm text-content-muted">
                        Back after a week is any visit seven or more days after
                        joining, counted once a week has passed for them; a
                        month, thirty. The curve reads each day the same way.
                        {data.invited.joined > 0 &&
                            ` ${formatCount(data.invited.joined)} joined through an invite${
                                data.invited.backWeek.of > 0
                                    ? `, and ${rate(data.invited.backWeek)}% of them were back after a week`
                                    : ""
                            }.`}
                    </p>
                </div>
            )}
        </section>
    );
};

export default Staying;
