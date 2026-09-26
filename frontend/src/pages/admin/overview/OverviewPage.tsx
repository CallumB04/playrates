import { useState } from "react";
import { Link } from "react-router-dom";
import type {
    AdminMetric,
    AdminOverview,
    AdminPeriodFigure,
    AdminRange,
} from "@playrates/shared";
import { cardClass } from "../../../components/ui/Card";
import { figureClass } from "../../../components/ui/Figure";
import SegmentedChoice from "../../../components/ui/SegmentedChoice";
import EmptyPlate from "../../../components/ui/EmptyPlate";
import { Skeleton, TextSkeleton } from "../../../components/ui/Skeleton";
import GameCover from "../../../components/game/GameCover";
import ProfilePicture from "../../../components/ProfilePicture";
import { cn } from "../../../lib/cn";
import { formatCount } from "../../../lib/format";
import { useAdminMetric, useAdminOverview } from "../../../hooks/queries/useAdmin";
import AdminPageHeader from "../components/AdminPageHeader";
import LinePlot from "../components/LinePlot";
import { SeeAllButton } from "../components/SeeAll";
import StatButton from "../components/StatButton";
import RawgAllowance from "../games/RawgAllowance";
import HealthGlance from "../health/HealthGlance";
import { bucketLabel, RANGE_LABELS } from "../lib/adminFormat";
import { changeWords } from "../lib/plot";
import MetricDetailModal from "./MetricDetailModal";

const RANGES: { value: AdminRange; label: string }[] = [
    { value: "7d", label: "7 days" },
    { value: "30d", label: "30 days" },
    { value: "90d", label: "90 days" },
    { value: "12m", label: "A year" },
];

/** The figure in its colour, the words in body ink. */
export const Change = ({ figure, previous }: { figure: AdminPeriodFigure; previous: string }) => {
    const { figure: text, words, tone } = changeWords(figure, previous);
    if (!text) return <>{words}</>;
    return (
        <>
            <span className={cn("font-mono", tone === "up" ? "text-success" : "text-danger")}>{text}</span> {words}
        </>
    );
};

/** A small figure with what it counts under it. */
const Aside = ({ value, label }: { value: number; label: string }) => (
    <div>
        <p className="font-mono text-figure-row text-content">{formatCount(value)}</p>
        <p className="mt-1 text-label-sm text-content-muted">{label}</p>
    </div>
);

const People = ({ data, onOpen }: { data: AdminOverview; onOpen: () => void }) => {
    const { totals, series, bucket } = data;
    const weekly = bucket === "week";
    return (
        <section aria-label="People using PlayRates" className={cardClass("relative overflow-hidden", { padding: "none" })}>
            <span
                aria-hidden
                className="pointer-events-none absolute -top-32 -right-28 size-80 rounded-full bg-brand/12 blur-3xl"
            />
            <div className="relative flex flex-col gap-6 px-5 py-5 sm:px-6 sm:py-6">
                <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
                    <div>
                        <h2 className="text-label text-content-muted">Used PlayRates in the last 7 days</h2>
                        <p className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                            <span className={figureClass("display")}>{formatCount(totals.wau)}</span>
                            <span className="text-label text-content-muted">
                                <Change figure={data.activeWeek} previous="week" />
                            </span>
                        </p>
                    </div>
                    <div className="flex gap-7">
                        <Aside value={totals.online} label="Here now" />
                        <Aside value={totals.dau} label="Today" />
                        <Aside value={totals.mau} label="Last 30 days" />
                    </div>
                </div>

                <LinePlot
                    series={[
                        { key: "day", label: weekly ? "That week" : "That day", values: series.map((p) => p.active), color: "var(--color-brand)" },
                        ...(weekly
                            ? []
                            : [{ key: "week", label: "The 7 days to then", values: series.map((p) => p.activeWeek), color: "var(--color-chart-2)", quiet: true }]),
                    ]}
                    label={`People who used PlayRates each ${bucket}, over ${RANGE_LABELS[data.range]}`}
                    height={120}
                    describe={(i) => {
                        const p = series[i]!;
                        return `${bucketLabel(p.bucket, bucket)}: ${p.active} used it${weekly ? "" : `, ${p.activeWeek} in the 7 days to then`}`;
                    }}
                    readout={(i) => {
                        const p = series[i]!;
                        return (
                            <span className="flex flex-wrap justify-between gap-x-3">
                                <span>
                                    <span className="font-mono text-content">{formatCount(p.active)}</span>{" "}
                                    {p.active === 1 ? "person" : "people"} {weekly ? "the week of" : "on"} {bucketLabel(p.bucket, "day")}
                                </span>
                                {!weekly && (
                                    <span className="text-content-muted">
                                        <span className="font-mono">{formatCount(p.activeWeek)}</span> in the 7 days to then
                                    </span>
                                )}
                            </span>
                        );
                    }}
                    axis={{ start: series[0] ? bucketLabel(series[0].bucket, "day") : "", end: weekly ? "this week" : "today" }}
                />

                <SeeAllButton onClick={onOpen} className="self-start">
                    Who, and on which days
                </SeeAllButton>
            </div>
        </section>
    );
};

const Period = ({ data, onOpen }: { data: AdminOverview; onOpen: (m: AdminMetric) => void }) => {
    const range = RANGE_LABELS[data.range];
    const items: { metric: AdminMetric; label: string; figure: AdminPeriodFigure }[] = [
        { metric: "users", label: "New accounts", figure: data.period.signups },
        { metric: "logs", label: "Games logged", figure: data.period.logs },
        { metric: "reviews", label: "Reviews written", figure: data.period.reviews },
        { metric: "community", label: "Community replies", figure: data.period.messages },
    ];
    return (
        <section aria-labelledby="period-heading" className={cardClass("px-5 py-4 sm:px-6", { padding: "none" })}>
            <h2 id="period-heading" className="text-label text-content-muted">
                In the last {range}
            </h2>
            <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-3 lg:grid-cols-4">
                {items.map((item) => (
                    <StatButton
                        key={item.metric}
                        value={formatCount(item.figure.current)}
                        label={item.label}
                        note={<Change figure={item.figure} previous={range} />}
                        onOpen={() => onOpen(item.metric)}
                    />
                ))}
            </div>
        </section>
    );
};

const LIST_HEADING = "flex items-baseline justify-between gap-3 border-b border-subtle pb-2";
const ROW = "flex min-h-11 items-center gap-3 rounded-sm px-1 py-1.5 lift hover:bg-surface-hover";

const Rank = ({ n }: { n: number }) => (
    <span className={cn("w-5 shrink-0 font-mono text-label-sm", n === 1 ? "font-semibold text-brand" : "text-content-muted")}>
        #{n}
    </span>
);

const Busiest = ({ range, onOpen }: { range: AdminRange; onOpen: () => void }) => {
    const { data } = useAdminMetric("users", range);
    const people = data?.metric === "users" ? data.mostActive.slice(0, 3) : null;
    return (
        <section className={cardClass()}>
            <div className={LIST_HEADING}>
                <h2 className="text-label text-content-muted">Most active people, last {RANGE_LABELS[range]}</h2>
                <SeeAllButton onClick={onOpen} />
            </div>
            {!people ? (
                <TextSkeleton lines={3} />
            ) : people.length === 0 ? (
                <p className="py-3 text-body-sm text-content-muted">Nobody has done anything in this time.</p>
            ) : (
                <ol className="pt-1">
                    {people.map((p, i) => (
                        <li key={p.username}>
                            <Link to={`/user/${p.username}`} className={ROW}>
                                <Rank n={i + 1} />
                                <span className="shrink-0 [&>*]:size-8">
                                    <ProfilePicture variant="nav" file={p.avatarUrl ?? ""} accent={p.accent} username={p.username} link={false} />
                                </span>
                                <span className="min-w-0 flex-1 truncate text-body-sm font-medium text-content">{p.username}</span>
                                <span className="shrink-0 text-label-sm text-content-muted">
                                    <span className="font-mono text-content-secondary">{formatCount(p.count)}</span>{" "}
                                    {p.count === 1 ? "action" : "actions"}
                                </span>
                            </Link>
                        </li>
                    ))}
                </ol>
            )}
            <p className="mt-2 text-label-sm text-content-muted">
                An action is a log, review, post, vote or friend request.
            </p>
        </section>
    );
};

const MostLogged = ({ range, onOpen }: { range: AdminRange; onOpen: () => void }) => {
    const { data } = useAdminMetric("logs", range);
    const games = data?.metric === "logs" ? data.topGames.slice(0, 5) : null;
    return (
        <section className={cardClass()}>
            <div className={LIST_HEADING}>
                <h2 className="text-label text-content-muted">Most logged games, last {RANGE_LABELS[range]}</h2>
                <SeeAllButton onClick={onOpen} />
            </div>
            {!games ? (
                <TextSkeleton lines={5} />
            ) : games.length === 0 ? (
                <p className="py-3 text-body-sm text-content-muted">Nobody logged a game in this time.</p>
            ) : (
                <ol className="pt-1">
                    {games.map((g, i) => (
                        <li key={g.id}>
                            <Link to={`/game/${g.id}`} className={ROW}>
                                <Rank n={i + 1} />
                                <GameCover coverUrl={g.coverUrl} title={g.title} className="aspect-3/4 w-7 shrink-0 overflow-hidden rounded-xs shadow-cover" />
                                <span className="min-w-0 flex-1 truncate text-body-sm font-medium text-content">{g.title}</span>
                                <span className="shrink-0 text-label-sm text-content-muted">
                                    <span className="font-mono text-content-secondary">{formatCount(g.count)}</span>{" "}
                                    {g.count === 1 ? "log" : "logs"}
                                </span>
                            </Link>
                        </li>
                    ))}
                </ol>
            )}
        </section>
    );
};

const Loading = () => (
    <div className="flex flex-col gap-6" aria-busy="true">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <Skeleton className="h-80 rounded-lg" />
            <div className="flex flex-col gap-4">
                <Skeleton className="h-44 rounded-lg" />
                <Skeleton className="h-28 rounded-lg" />
            </div>
        </div>
        <Skeleton className="h-32 rounded-lg" />
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
                actions={<SegmentedChoice label="Period" value={range} onChange={setRange} segments={RANGES} />}
            />

            {isError ? (
                <EmptyPlate title="The numbers didn’t load" body="The API or the database isn’t answering. Health says which." />
            ) : isPending || !data ? (
                <Loading />
            ) : (
                <div className={cn("flex flex-col gap-6 transition-opacity", isPlaceholderData && "opacity-60")}>
                    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
                        <People data={data} onOpen={() => setOpen("users")} />
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                            <RawgAllowance compact />
                            <HealthGlance />
                        </div>
                    </div>
                    <Period data={data} onOpen={setOpen} />
                    <div className="grid items-start gap-6 lg:grid-cols-2">
                        <Busiest range={range} onOpen={() => setOpen("users")} />
                        <MostLogged range={range} onOpen={() => setOpen("logs")} />
                    </div>
                </div>
            )}

            {open && <MetricDetailModal metric={open} range={range} overview={data} onClose={() => setOpen(null)} />}
        </>
    );
};

export default OverviewPage;
