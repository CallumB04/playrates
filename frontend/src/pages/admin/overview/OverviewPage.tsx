import { useState } from "react";
import { Link } from "react-router-dom";
import type {
    AdminMetric,
    AdminOverview,
    AdminPeriodFigure,
    AdminRange,
    AdminSeriesPoint,
} from "@playrates/shared";
import { cardClass } from "../../../components/ui/Card";
import { figureClass } from "../../../components/ui/Figure";
import SegmentedChoice from "../../../components/ui/SegmentedChoice";
import EmptyPlate from "../../../components/ui/EmptyPlate";
import { Skeleton } from "../../../components/ui/Skeleton";
import ProfilePicture from "../../../components/ProfilePicture";
import { cn } from "../../../lib/cn";
import { formatCount, relativeTime } from "../../../lib/format";
import {
    useAdminMetric,
    useAdminOverview,
    useAdminUsers,
} from "../../../hooks/queries/useAdmin";
import AdminPageHeader from "../components/AdminPageHeader";
import BarPlot from "../components/BarPlot";
import SectionHeader from "../components/SectionHeader";
import StatButton from "../components/StatButton";
import { bucketLabel, RANGE_LABELS } from "../lib/adminFormat";
import { addedIn, changeWords, plural, type PlotBar } from "../lib/plot";
import MetricDetailModal from "./MetricDetailModal";

const RANGES: { value: AdminRange; label: string }[] = [
    { value: "7d", label: "7 days" },
    { value: "30d", label: "30 days" },
    { value: "90d", label: "90 days" },
    { value: "12m", label: "A year" },
];

/** In series order, and never cycled; the same four everywhere they appear. */
const MADE = [
    { key: "logs", label: "Logs", one: "log", fill: "bg-chart-1" },
    { key: "reviews", label: "Reviews", one: "review", fill: "bg-chart-2" },
    { key: "messages", label: "Replies", one: "reply", fill: "bg-chart-3" },
    { key: "threads", label: "Threads", one: "thread", fill: "bg-chart-4" },
] as const;

const many = (m: (typeof MADE)[number]) => m.label.toLowerCase();

const single = (series: AdminSeriesPoint[], pick: (p: AdminSeriesPoint) => number, fill: string): PlotBar[] =>
    series.map((p) => ({ key: p.bucket, segments: [{ key: "v", value: pick(p), className: fill }] }));

/** The figure in its colour, the words in body ink. */
const Change = ({ figure, previous }: { figure: AdminPeriodFigure; previous: string }) => {
    const { figure: text, words, tone } = changeWords(figure, previous);
    if (!text) return <>{words}</>;
    return (
        <>
            <span className={cn("font-mono", tone === "up" ? "text-success" : "text-danger")}>{text}</span>{" "}
            {words}
        </>
    );
};

const Hero = ({
    data,
    onOpen,
}: {
    data: AdminOverview;
    onOpen: (metric: AdminMetric) => void;
}) => {
    const { totals, period, series, bucket } = data;
    const range = RANGE_LABELS[data.range];
    const unit = bucket === "week" ? "week" : "day";
    const bars = single(series, (p) => p.active, "bg-brand");

    return (
        <section aria-label="This week" className={cardClass("relative overflow-hidden", { padding: "none" })}>
            <span
                aria-hidden
                className="pointer-events-none absolute -top-32 -right-28 size-80 rounded-full bg-brand/12 blur-3xl"
            />

            <div className="relative grid gap-8 px-5 py-6 sm:px-6 sm:py-7 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-12 lg:px-8 lg:py-8">
                <div className="flex min-w-0 flex-col">
                    <h2 className="text-label text-content-muted">Around this week</h2>
                    <p className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className={figureClass("display")}>{formatCount(totals.wau)}</span>
                        <span className="text-body text-content-secondary">
                            {totals.wau === 1 ? "person" : "people"} in the last seven days
                        </span>
                    </p>
                    <p className="mt-4 max-w-[42ch] text-body-sm text-content-secondary">
                        <span className="font-mono text-content">{formatCount(totals.dau)}</span> of
                        them today, <span className="font-mono text-content">{formatCount(totals.mau)}</span>{" "}
                        this month, and <span className="font-mono text-content">{formatCount(totals.online)}</span>{" "}
                        here right now.
                    </p>
                    <p className="mt-2 text-body-sm text-content-muted">
                        <Change figure={data.activeWeek} previous="week" />.
                    </p>
                </div>

                <BarPlot
                    bars={bars}
                    label={`People active each ${unit}, over ${range}`}
                    height={112}
                    describe={(i) => {
                        const p = series[i]!;
                        return `${bucketLabel(p.bucket, bucket)}: ${p.active} active`;
                    }}
                    readout={(i) => {
                        const p = series[i]!;
                        return (
                            <span className="flex flex-wrap justify-between gap-x-3">
                                <span>
                                    <span className="font-mono text-content">{formatCount(p.active)}</span>{" "}
                                    active {bucket === "week" ? "the week of" : "on"}{" "}
                                    {bucketLabel(p.bucket, "day")}
                                </span>
                                {bucket === "day" && (
                                    <span className="text-content-muted">
                                        <span className="font-mono">{formatCount(p.activeWeek)}</span> across the week to then
                                    </span>
                                )}
                            </span>
                        );
                    }}
                    axis={{
                        start: series[0] ? bucketLabel(series[0].bucket, "day") : "",
                        end: bucket === "week" ? "this week" : "today",
                    }}
                />
            </div>

            <div className="relative grid grid-cols-2 gap-x-6 gap-y-3 border-t border-subtle px-5 py-4 sm:grid-cols-3 sm:px-6 lg:grid-cols-5 lg:px-8">
                <StatButton
                    value={formatCount(totals.users)}
                    label="People"
                    note={addedIn(period.signups.current, range)}
                    onOpen={() => onOpen("users")}
                />
                <StatButton
                    value={formatCount(totals.logs)}
                    label="Game logs"
                    note={addedIn(period.logs.current, range)}
                    onOpen={() => onOpen("logs")}
                />
                <StatButton
                    value={formatCount(totals.reviews)}
                    label="Reviews"
                    note={addedIn(period.reviews.current, range)}
                    onOpen={() => onOpen("reviews")}
                />
                <StatButton
                    value={formatCount(totals.messages)}
                    label="Replies"
                    note={`in ${plural(totals.threads, "thread")}`}
                    onOpen={() => onOpen("community")}
                />
                <StatButton
                    value={formatCount(totals.games)}
                    label="Games"
                    note="in the catalogue"
                    onOpen={() => onOpen("games")}
                />
            </div>
        </section>
    );
};

const Made = ({ data }: { data: AdminOverview }) => {
    const { series, bucket, period } = data;
    const range = RANGE_LABELS[data.range];
    const bars: PlotBar[] = series.map((p) => ({
        key: p.bucket,
        segments: MADE.map((m) => ({ key: m.key, value: p[m.key], className: m.fill })),
    }));

    return (
        <section>
            <SectionHeader
                title="What people made"
                note={`each ${bucket}, over ${range}`}
            />
            <div className={cardClass("flex flex-col gap-5")}>
                <BarPlot
                    bars={bars}
                    label={`Logs, reviews, replies and threads each ${bucket}`}
                    height={132}
                    describe={(i) => {
                        const p = series[i]!;
                        return `${bucketLabel(p.bucket, bucket)}: ${MADE.map((m) => plural(p[m.key], m.one, many(m))).join(", ")}`;
                    }}
                    readout={(i) => {
                        const p = series[i]!;
                        return (
                            <span className="flex flex-wrap gap-x-3 gap-y-1">
                                <span className="text-content">{bucketLabel(p.bucket, bucket)}</span>
                                {MADE.map((m) => (
                                    <span key={m.key} className="text-content-muted">
                                        <span className="font-mono text-content-secondary">{p[m.key]}</span>{" "}
                                        {p[m.key] === 1 ? m.one : many(m)}
                                    </span>
                                ))}
                            </span>
                        );
                    }}
                    axis={{
                        start: series[0] ? bucketLabel(series[0].bucket, "day") : "",
                        end: bucket === "week" ? "this week" : "today",
                    }}
                />

                <ul className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-subtle pt-4 sm:grid-cols-4">
                    {MADE.map((m) => (
                        <li key={m.key} className="min-w-0">
                            <span className="flex items-center gap-2 text-label text-content-secondary">
                                <span aria-hidden className={cn("size-2 shrink-0 rounded-full", m.fill)} />
                                {m.label}
                            </span>
                            <span className="mt-1 block font-mono text-figure-row text-content">
                                {formatCount(period[m.key].current)}
                            </span>
                            <span className="mt-1 block text-label-sm text-content-muted">
                                <Change figure={period[m.key]} previous={range} />
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
};

const Signups = ({ data }: { data: AdminOverview }) => {
    const { series, bucket, period } = data;
    return (
        <section>
            <SectionHeader
                title="Sign-ups"
                note={<><span className="font-mono">{formatCount(period.signups.current)}</span> in {RANGE_LABELS[data.range]}</>}
            />
            <div className={cardClass()}>
                <BarPlot
                    bars={single(series, (p) => p.signups, "bg-brand")}
                    label={`New accounts each ${bucket}`}
                    height={56}
                    describe={(i) => {
                        const p = series[i]!;
                        return `${bucketLabel(p.bucket, bucket)}: ${plural(p.signups, "new account")}`;
                    }}
                    axis={{
                        start: series[0] ? bucketLabel(series[0].bucket, "day") : "",
                        end: bucket === "week" ? "this week" : "today",
                    }}
                />
            </div>
        </section>
    );
};

const ASIDE_HEADING = "px-3 pt-3 pb-1.5 text-label text-content-muted";
const ASIDE_ROW =
    "flex items-center gap-2.5 rounded-sm px-3 py-2 lift hover:bg-surface-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand";

/** Who is doing the most, and who just arrived. One plain card, like the
 *  community's own column. */
const People = ({ range }: { range: AdminRange }) => {
    const { data: detail } = useAdminMetric("users", range);
    const { data: newest } = useAdminUsers({ sort: "joined" });
    const active = detail?.metric === "users" ? detail.mostActive.slice(0, 5) : [];
    const joined = newest?.data.slice(0, 5) ?? [];

    return (
        <aside className={cardClass("flex flex-col pb-1.5", { padding: "none" })}>
            <h2 className={ASIDE_HEADING}>Busiest over {RANGE_LABELS[range]}</h2>
            {active.length === 0 ? (
                <p className="px-3 py-2 text-body-sm text-content-muted">Nobody has done anything yet.</p>
            ) : (
                <ol>
                    {active.map((person, i) => (
                        <li key={person.username}>
                            <Link to={`/user/${person.username}`} className={ASIDE_ROW}>
                                <span
                                    className={cn(
                                        "w-5 shrink-0 font-mono text-label-sm",
                                        i === 0 ? "font-semibold text-brand" : "text-content-muted"
                                    )}
                                >
                                    #{i + 1}
                                </span>
                                <span className="shrink-0 [&>*]:size-7">
                                    <ProfilePicture variant="nav" file={person.avatarUrl ?? ""} accent={person.accent} username={person.username} link={false} />
                                </span>
                                <span className="min-w-0 flex-1 truncate text-body-sm font-medium text-content">
                                    {person.username}
                                </span>
                                <span className="shrink-0 font-mono text-label-sm text-content-muted">
                                    {formatCount(person.count)}
                                </span>
                            </Link>
                        </li>
                    ))}
                </ol>
            )}

            <hr className="mx-3 my-1.5 border-subtle" />

            <h2 className={ASIDE_HEADING}>Newest here</h2>
            <ul>
                {joined.map((user) => (
                    <li key={user.id}>
                        <Link to={`/user/${user.username}`} className={ASIDE_ROW}>
                            <span className="shrink-0 [&>*]:size-7">
                                <ProfilePicture variant="nav" file={user.avatarUrl ?? ""} accent={user.accent} username={user.username} link={false} />
                            </span>
                            <span className="min-w-0 flex-1 truncate text-body-sm font-medium text-content">
                                {user.username}
                            </span>
                            <span className="shrink-0 text-label-sm text-content-muted">
                                {relativeTime(user.createdAt)}
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>
        </aside>
    );
};

const Loading = () => (
    <div className="flex flex-col gap-8" aria-busy="true">
        <Skeleton className="h-[21rem] rounded-lg" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <Skeleton className="h-72 rounded-lg" />
            <Skeleton className="h-72 rounded-lg" />
        </div>
    </div>
);

const OverviewPage = () => {
    const [range, setRange] = useState<AdminRange>("30d");
    const [open, setOpen] = useState<AdminMetric | null>(null);
    const { data, isPending, isError, isPlaceholderData } = useAdminOverview(range);

    return (
        <>
            <AdminPageHeader
                title="Overview"
                description="How PlayRates is doing. Every day here ends at midnight UTC."
                actions={
                    <SegmentedChoice label="Period" value={range} onChange={setRange} segments={RANGES} />
                }
            />

            {isError ? (
                <EmptyPlate
                    title="The numbers didn’t load"
                    body="Either the API or the database isn’t answering. Health will say which."
                />
            ) : isPending || !data ? (
                <Loading />
            ) : (
                <div
                    className={cn(
                        "flex flex-col gap-10 transition-opacity",
                        isPlaceholderData && "opacity-60"
                    )}
                >
                    <Hero data={data} onOpen={setOpen} />
                    <div className="grid items-start gap-x-6 gap-y-10 lg:grid-cols-[minmax(0,1fr)_300px]">
                        <div className="flex min-w-0 flex-col gap-10">
                            <Made data={data} />
                            <Signups data={data} />
                        </div>
                        <div className="lg:pt-12">
                            <People range={range} />
                        </div>
                    </div>
                </div>
            )}

            {open && (
                <MetricDetailModal metric={open} range={range} overview={data} onClose={() => setOpen(null)} />
            )}
        </>
    );
};

export default OverviewPage;
