import { useState } from "react";
import type {
    AdminOverview,
    AdminRange,
    AdminSeriesPoint,
} from "@playrates/shared";
import SegmentedChoice from "../../../components/ui/SegmentedChoice";
import EmptyPlate from "../../../components/ui/EmptyPlate";
import { Skeleton, TextSkeleton } from "../../../components/ui/Skeleton";
import GameCover from "../../../components/game/GameCover";
import ProfilePicture from "../../../components/ProfilePicture";
import { cn } from "../../../lib/cn";
import { BREAKPOINT, useMediaQuery } from "../../../hooks/useMediaQuery";
import { formatCount } from "../../../lib/format";
import {
    useAdminHealth,
    useAdminMetric,
    useAdminOverview,
    useRawgUsage,
} from "../../../hooks/queries/useAdmin";
import AdminPageHeader from "../components/AdminPageHeader";
import BarPlot from "../components/BarPlot";
import LinePlot from "../components/LinePlot";
import SectionHeader from "../components/SectionHeader";
import { AllowanceMeter } from "../games/RawgAllowance";
import { headline, STATE, systemStates } from "../health/healthState";
import { bucketLabel, RANGE_LABELS } from "../lib/adminFormat";
import { addedIn, runningTotal } from "../lib/plot";
import { Change } from "./Change";
import InsightCard from "./InsightCard";
import { LogsPopup, RepliesPopup, ReviewsPopup } from "./popups/ActivityPopups";
import {
    HealthPopup,
    MostActivePopup,
    MostLoggedPopup,
    RawgPopup,
} from "./popups/OtherPopups";
import {
    ActiveUsersPopup,
    SignupsPopup,
    TotalUsersPopup,
} from "./popups/PeoplePopups";

const RANGES: { value: AdminRange; label: string }[] = [
    { value: "7d", label: "7 days" },
    { value: "30d", label: "30 days" },
    { value: "90d", label: "90 days" },
    { value: "12m", label: "A year" },
];

type Open =
    | "total"
    | "active"
    | "signups"
    | "logs"
    | "reviews"
    | "replies"
    | "mostActive"
    | "mostLogged"
    | "rawg"
    | "health";

const axisOf = (data: AdminOverview) => ({
    start: data.series[0] ? bucketLabel(data.series[0].bucket, "day") : "",
    end: data.bucket === "week" ? "this week" : "today",
});

/** A card's chart: the same drawing as its popup's, only smaller and still. */
const Bars = ({
    data,
    pick,
    fill,
    height,
    label,
    empty,
}: {
    data: AdminOverview;
    pick: (p: AdminSeriesPoint) => number;
    fill: string;
    height: number;
    label: string;
    empty: string;
}) => (
    <BarPlot
        still
        empty={empty}
        bars={data.series.map((p) => ({
            key: p.bucket,
            segments: [{ key: "v", value: pick(p), className: fill }],
        }))}
        label={label}
        describe={() => label}
        height={height}
        axis={axisOf(data)}
    />
);

const KeyRow = ({
    data,
    open,
}: {
    data: AdminOverview;
    open: (o: Open) => void;
}) => {
    // Beside its figure on a phone, the chart is short; stacked, tall.
    const keyHeight = useMediaQuery(BREAKPOINT.lg) ? 120 : 64;
    const range = RANGE_LABELS[data.range];
    const { totals, period, series } = data;
    const accounts = runningTotal(
        totals.users,
        series.map((p) => p.signups)
    );
    return (
        <div className="grid gap-4 lg:grid-cols-3">
            <InsightCard
                size="key"
                label="Total users"
                value={formatCount(totals.users)}
                note={addedIn(period.signups.current, range)}
                onOpen={() => open("total")}
            >
                <LinePlot
                    still
                    series={[
                        {
                            key: "accounts",
                            label: "Accounts",
                            values: accounts,
                            color: "var(--color-brand)",
                        },
                    ]}
                    label={`Accounts in total over ${range}`}
                    describe={() => ""}
                    height={keyHeight}
                    axis={axisOf(data)}
                />
            </InsightCard>
            <InsightCard
                size="key"
                label="Active users · last 7 days"
                value={formatCount(totals.wau)}
                note={<Change figure={data.activeWeek} previous="week" />}
                onOpen={() => open("active")}
            >
                <LinePlot
                    still
                    series={[
                        {
                            key: "week",
                            label: "People",
                            // The seven days to each day, so the line ends
                            // on the figure above it.
                            values: series.map((p) =>
                                data.bucket === "week" ? p.active : p.activeWeek
                            ),
                            color: "var(--color-chart-2)",
                        },
                    ]}
                    label={`People who used PlayRates in the 7 days to each ${data.bucket}, over ${range}`}
                    describe={() => ""}
                    height={keyHeight}
                    axis={axisOf(data)}
                />
            </InsightCard>
            <InsightCard
                size="key"
                label={`New sign-ups · last ${range}`}
                value={formatCount(period.signups.current)}
                note={<Change figure={period.signups} previous={range} />}
                onOpen={() => open("signups")}
            >
                <Bars
                    data={data}
                    pick={(p) => p.signups}
                    fill="bg-chart-4"
                    height={keyHeight}
                    label={`New accounts each ${data.bucket}, over ${range}`}
                    empty="Nobody joined in this time"
                />
            </InsightCard>
        </div>
    );
};

const ActivityRow = ({
    data,
    open,
}: {
    data: AdminOverview;
    open: (o: Open) => void;
}) => {
    const range = RANGE_LABELS[data.range];
    const items = [
        {
            key: "logs" as const,
            label: "Games logged",
            empty: "No games logged in this time",
            figure: data.period.logs,
            pick: (p: AdminSeriesPoint) => p.logs,
            fill: "bg-chart-1",
        },
        {
            key: "reviews" as const,
            label: "Reviews written",
            empty: "No reviews in this time",
            figure: data.period.reviews,
            pick: (p: AdminSeriesPoint) => p.reviews,
            fill: "bg-chart-2",
        },
        {
            key: "replies" as const,
            label: "Community replies",
            empty: "No replies in this time",
            figure: data.period.messages,
            pick: (p: AdminSeriesPoint) => p.messages,
            fill: "bg-chart-3",
        },
    ];
    return (
        <div className="grid gap-4 lg:grid-cols-3">
            {items.map((item) => (
                <InsightCard
                    key={item.key}
                    label={`${item.label} · last ${range}`}
                    value={formatCount(item.figure.current)}
                    note={<Change figure={item.figure} previous={range} />}
                    onOpen={() => open(item.key)}
                >
                    <Bars
                        data={data}
                        pick={item.pick}
                        fill={item.fill}
                        height={48}
                        label={`${item.label} each ${data.bucket}`}
                        empty={item.empty}
                    />
                </InsightCard>
            ))}
        </div>
    );
};

/** A ranked row inside a card: plain, since the card itself is the button. */
const Ranked = ({
    n,
    leads,
    lead,
    label,
    count,
    unit,
}: {
    n: number;
    /** Level with the first, so marked the same. */
    leads: boolean;
    lead: React.ReactNode;
    label: string;
    count: number;
    unit: [string, string];
}) => (
    <li className="flex items-center gap-3 py-1.5">
        <span
            className={cn(
                "w-5 shrink-0 font-mono text-label-sm",
                leads ? "font-semibold text-brand" : "text-content-muted"
            )}
        >
            #{n}
        </span>
        {lead}
        <span className="min-w-0 flex-1 truncate text-body-sm font-medium text-content">
            {label}
        </span>
        <span className="shrink-0 text-label-sm text-content-muted">
            <span className="font-mono text-content-secondary">
                {formatCount(count)}
            </span>{" "}
            {count === 1 ? unit[0] : unit[1]}
        </span>
    </li>
);

const Leaders = ({
    range,
    open,
}: {
    range: AdminRange;
    open: (o: Open) => void;
}) => {
    const { data: users } = useAdminMetric("users", range);
    const { data: logs } = useAdminMetric("logs", range);
    const people =
        users?.metric === "users" ? users.mostActive.slice(0, 5) : null;
    const games = logs?.metric === "logs" ? logs.topGames.slice(0, 5) : null;
    const span = RANGE_LABELS[range];

    return (
        <div className="grid gap-4 md:grid-cols-2">
            <InsightCard
                label={`Most active people · last ${span}`}
                onOpen={() => open("mostActive")}
            >
                {!people ? (
                    <TextSkeleton lines={5} />
                ) : people.length === 0 ? (
                    <p className="text-body-sm text-content-muted">
                        Nobody did anything in this time.
                    </p>
                ) : (
                    <ol>
                        {people.map((p, i) => (
                            <Ranked
                                key={p.username}
                                n={i + 1}
                                leads={p.count === people[0]!.count}
                                label={p.username}
                                count={p.count}
                                unit={["action", "actions"]}
                                lead={
                                    <span className="shrink-0 [&>*]:size-8">
                                        <ProfilePicture
                                            variant="nav"
                                            file={p.avatarUrl ?? ""}
                                            accent={p.accent}
                                            username={p.username}
                                            link={false}
                                        />
                                    </span>
                                }
                            />
                        ))}
                    </ol>
                )}
            </InsightCard>
            <InsightCard
                label={`Most logged games · last ${span}`}
                onOpen={() => open("mostLogged")}
            >
                {!games ? (
                    <TextSkeleton lines={5} />
                ) : games.length === 0 ? (
                    <p className="text-body-sm text-content-muted">
                        Nobody logged a game in this time.
                    </p>
                ) : (
                    <ol>
                        {games.map((g, i) => (
                            <Ranked
                                key={g.id}
                                n={i + 1}
                                leads={g.count === games[0]!.count}
                                label={g.title}
                                count={g.count}
                                unit={["log", "logs"]}
                                lead={
                                    <GameCover
                                        coverUrl={g.coverUrl}
                                        title={g.title}
                                        className="aspect-3/4 w-6 shrink-0 overflow-hidden rounded-[4px]"
                                    />
                                }
                            />
                        ))}
                    </ol>
                )}
            </InsightCard>
        </div>
    );
};

const Running = ({ open }: { open: (o: Open) => void }) => {
    const { data: usage } = useRawgUsage();
    const health = useAdminHealth();
    const h = health.data;
    const states = h ? systemStates(h) : null;
    const lead = h && states ? headline(states, h.errors.last24h) : null;

    return (
        <div className="grid gap-4 md:grid-cols-2">
            <InsightCard
                label="RAWG requests left"
                value={usage ? formatCount(usage.left) : "…"}
                note={usage ? `of ${formatCount(usage.allowance)}` : undefined}
                onOpen={() => open("rawg")}
            >
                {usage ? (
                    <AllowanceMeter usage={usage} />
                ) : (
                    <Skeleton className="h-10" />
                )}
            </InsightCard>
            <InsightCard label="Health" onOpen={() => open("health")}>
                {!lead || !states ? (
                    health.isPending ? (
                        <TextSkeleton lines={2} />
                    ) : (
                        <span className="flex items-start gap-2.5 text-body-sm font-medium text-content">
                            <span
                                aria-hidden
                                className="mt-1.5 size-2 shrink-0 rounded-full bg-danger"
                            />
                            The API isn’t answering.
                        </span>
                    )
                ) : (
                    <span className="flex flex-col gap-4">
                        <span className="flex items-start gap-2.5 text-body font-medium text-content">
                            <span
                                aria-hidden
                                className={cn(
                                    "mt-2 size-2 shrink-0 rounded-full",
                                    STATE[lead.state].dot
                                )}
                            />
                            {lead.text}
                        </span>
                        <span className="flex flex-wrap gap-x-5 gap-y-2 border-t border-subtle pt-3">
                            {(
                                [
                                    ["API", states.api],
                                    ["Database", states.database],
                                    ["RAWG", states.rawg],
                                    ["Requests", states.errors],
                                ] as const
                            ).map(([name, state]) => (
                                <span
                                    key={name}
                                    className="flex items-center gap-1.5 text-label text-content-secondary"
                                >
                                    <span
                                        aria-hidden
                                        className={cn(
                                            "size-1.5 rounded-full",
                                            STATE[state].dot
                                        )}
                                    />
                                    {name}
                                </span>
                            ))}
                        </span>
                    </span>
                )}
            </InsightCard>
        </div>
    );
};

const Loading = () => (
    <div className="flex flex-col gap-4" aria-busy="true">
        <div className="grid gap-4 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-60 rounded-lg" />
            ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-40 rounded-lg" />
            ))}
        </div>
    </div>
);

/**
 * The three figures that say how PlayRates is doing sit on top, equal, each
 * with its chart. Everything else follows in the order it's reached for, and
 * every card opens into the same data at full size.
 */
const OverviewPage = () => {
    const [range, setRange] = useState<AdminRange>("30d");
    const [open, setOpen] = useState<Open | null>(null);
    const { data, isPending, isError, isPlaceholderData } =
        useAdminOverview(range);
    const close = () => setOpen(null);

    return (
        <>
            <AdminPageHeader
                title="Overview"
                actions={
                    <SegmentedChoice
                        label="Period"
                        value={range}
                        onChange={setRange}
                        segments={RANGES}
                    />
                }
            />

            {isError ? (
                <EmptyPlate
                    title="The numbers didn’t load"
                    body="The API or the database isn’t answering. Health says which."
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
                    <KeyRow data={data} open={setOpen} />

                    <section className="flex flex-col gap-4">
                        <SectionHeader
                            title="What people did"
                            className="mb-0"
                        />
                        <ActivityRow data={data} open={setOpen} />
                        <Leaders range={range} open={setOpen} />
                    </section>

                    <section className="flex flex-col gap-4">
                        <SectionHeader
                            title="Keeping it running"
                            className="mb-0"
                        />
                        <Running open={setOpen} />
                    </section>
                </div>
            )}

            {data && open === "total" && (
                <TotalUsersPopup data={data} onClose={close} />
            )}
            {data && open === "active" && (
                <ActiveUsersPopup data={data} onClose={close} />
            )}
            {data && open === "signups" && (
                <SignupsPopup data={data} onClose={close} />
            )}
            {data && open === "logs" && (
                <LogsPopup data={data} onClose={close} />
            )}
            {data && open === "reviews" && (
                <ReviewsPopup data={data} onClose={close} />
            )}
            {data && open === "replies" && (
                <RepliesPopup data={data} onClose={close} />
            )}
            {open === "mostActive" && (
                <MostActivePopup range={range} onClose={close} />
            )}
            {open === "mostLogged" && (
                <MostLoggedPopup range={range} onClose={close} />
            )}
            {open === "rawg" && <RawgPopup onClose={close} />}
            {open === "health" && <HealthPopup onClose={close} />}
        </>
    );
};

export default OverviewPage;
