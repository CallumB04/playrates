import { useId, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type {
    AdminMetric,
    AdminMetricDetail,
    AdminOverview,
    AdminRange,
    AdminRankedGame,
} from "@playrates/shared";
import Modal from "../../../components/ui/Modal";
import Progress from "../../../components/ui/Progress";
import { TextSkeleton } from "../../../components/ui/Skeleton";
import GameCover from "../../../components/game/GameCover";
import ProfilePicture from "../../../components/ProfilePicture";
import { threadPath } from "../../../components/community/paths";
import {
    STATUS_PRESENTATION,
    isDisplayStatus,
} from "../../../constants/gameStatus";
import { formatCount, formatRating } from "../../../lib/format";
import { useAdminMetric } from "../../../hooks/queries/useAdmin";
import { StackedColumns, TrendChart, type Series } from "../charts/charts";
import { RANGE_LABELS, share } from "../lib/adminFormat";

const TITLES: Record<AdminMetric, string> = {
    users: "People",
    logs: "Game logs",
    reviews: "Reviews",
    community: "Community",
    games: "The catalogue",
};

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
    <section className="flex flex-col gap-3">
        <h3 className="text-label font-medium text-content-secondary">{title}</h3>
        {children}
    </section>
);

/** A labelled share of a whole, with the numbers beside the bar. */
const ShareRow = ({
    label,
    part,
    whole,
    fillClassName,
}: {
    label: string;
    part: number;
    whole: number;
    fillClassName?: string;
}) => (
    <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-3 text-body-sm">
            <span className="text-content-secondary">{label}</span>
            <span className="font-mono text-content tabular-nums">
                {formatCount(part)}{" "}
                <span className="text-content-muted">{share(part, whole)}</span>
            </span>
        </div>
        <Progress
            value={whole === 0 ? 0 : part / whole}
            label={`${label}: ${share(part, whole)}`}
            size="sm"
            fillClassName={fillClassName}
        />
    </div>
);

const Figures = ({ items }: { items: { label: string; value: string }[] }) => (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((item) => (
            <div
                key={item.label}
                className="rounded-md border border-subtle bg-surface-sunken/40 px-3 py-2"
            >
                <dt className="text-label-sm text-content-muted">{item.label}</dt>
                <dd className="font-mono text-figure-sm text-content tabular-nums">
                    {item.value}
                </dd>
            </div>
        ))}
    </dl>
);

const GameList = ({
    games,
    noun,
}: {
    games: AdminRankedGame[];
    /** Singular and plural. */
    noun: [string, string];
}) =>
    games.length === 0 ? (
        <p className="text-body-sm text-content-muted">None in this period.</p>
    ) : (
        <ol className="flex flex-col gap-2">
            {games.map((game, index) => (
                <li key={game.id}>
                    <Link
                        to={`/game/${game.id}`}
                        className="flex min-h-11 items-center gap-3 rounded-md px-1 hover:bg-surface-hover"
                    >
                        <span className="w-4 shrink-0 text-right font-mono text-label-sm text-content-muted">
                            {index + 1}
                        </span>
                        <GameCover
                            coverUrl={game.coverUrl}
                            title={game.title}
                            className="w-8 shrink-0 rounded-xs"
                        />
                        <span className="min-w-0 flex-1 truncate text-body-sm text-content">
                            {game.title}
                        </span>
                        <span className="shrink-0 font-mono text-label text-content-secondary tabular-nums">
                            {formatCount(game.count)} {game.count === 1 ? noun[0] : noun[1]}
                        </span>
                    </Link>
                </li>
            ))}
        </ol>
    );

const Body = ({
    detail,
    overview,
}: {
    detail: AdminMetricDetail;
    overview: AdminOverview | undefined;
}) => {
    const series = overview?.series ?? [];
    const bucket = overview?.bucket ?? "day";
    const range = overview ? RANGE_LABELS[overview.range] : "";

    switch (detail.metric) {
        case "users": {
            const { lastSeen } = detail;
            return (
                <>
                    <Section title="Last seen">
                        <ShareRow label="Online now" part={lastSeen.online} whole={lastSeen.total} />
                        <ShareRow label="In the last day" part={lastSeen.today} whole={lastSeen.total} />
                        <ShareRow label="In the last week" part={lastSeen.week} whole={lastSeen.total} />
                        <ShareRow label="In the last month" part={lastSeen.month} whole={lastSeen.total} />
                        <ShareRow
                            label="Finished the welcome"
                            part={detail.onboarded}
                            whole={lastSeen.total}
                            fillClassName="bg-success"
                        />
                    </Section>
                    <Section title={`Sign-ups over ${range}`}>
                        <StackedColumns
                            data={series}
                            series={SIGNUPS}
                            bucket={bucket}
                            caption={`Sign-ups per ${bucket}`}
                            height={140}
                        />
                    </Section>
                    <Section title={`Most active over ${range}`}>
                        {detail.mostActive.length === 0 ? (
                            <p className="text-body-sm text-content-muted">Nobody yet.</p>
                        ) : (
                            <ol className="flex flex-col gap-1">
                                {detail.mostActive.map((person) => (
                                    <li key={person.username}>
                                        <Link
                                            to={`/user/${person.username}`}
                                            className="flex min-h-11 items-center gap-3 rounded-md px-1 hover:bg-surface-hover"
                                        >
                                            <ProfilePicture
                                                variant="friendRow"
                                                file={person.avatarUrl ?? ""}
                                                accent={person.accent}
                                                username={person.username}
                                                link={false}
                                            />
                                            <span className="min-w-0 flex-1 truncate text-body-sm text-content">
                                                {person.username}
                                            </span>
                                            <span className="font-mono text-label text-content-secondary tabular-nums">
                                                {formatCount(person.count)} {person.count === 1 ? "action" : "actions"}
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </Section>
                </>
            );
        }

        case "logs": {
            const total = Object.values(detail.byStatus).reduce((a, b) => a + b, 0);
            const played = Object.values(detail.byPlayedStatus).reduce((a, b) => a + b, 0);
            return (
                <>
                    <Figures
                        items={[
                            { label: "Logs", value: formatCount(total) },
                            {
                                label: "With a rating",
                                value:
                                    detail.ratedShare === null
                                        ? "—"
                                        : `${Math.round(detail.ratedShare * 100)}%`,
                            },
                            {
                                label: "Average rating",
                                value: formatRating(detail.averageRating),
                            },
                        ]}
                    />
                    <Section title="By shelf">
                        {Object.entries(detail.byStatus).map(([status, count]) => (
                            <ShareRow
                                key={status}
                                label={isDisplayStatus(status) ? STATUS_PRESENTATION[status].label : status}
                                part={count}
                                whole={total}
                                fillClassName={isDisplayStatus(status) ? STATUS_PRESENTATION[status].accent : undefined}
                            />
                        ))}
                    </Section>
                    {played > 0 && (
                        <Section title="How plays ended">
                            {Object.entries(detail.byPlayedStatus).map(([status, count]) => (
                                <ShareRow
                                    key={status}
                                    label={isDisplayStatus(status) ? STATUS_PRESENTATION[status].label : status}
                                    part={count}
                                    whole={played}
                                    fillClassName={isDisplayStatus(status) ? STATUS_PRESENTATION[status].accent : undefined}
                                />
                            ))}
                        </Section>
                    )}
                    <Section title={`Most logged over ${range}`}>
                        <GameList games={detail.topGames} noun={["log", "logs"]} />
                    </Section>
                </>
            );
        }

        case "reviews": {
            const total = detail.public + detail.private;
            return (
                <>
                    <Figures
                        items={[
                            { label: "Reviews", value: formatCount(total) },
                            { label: `Upvotes in ${range}`, value: formatCount(detail.upvotes) },
                            { label: "Marked as spoilers", value: share(detail.spoilers, total) },
                        ]}
                    />
                    <Section title="Who can read them">
                        <ShareRow label="Public" part={detail.public} whole={total} />
                        <ShareRow
                            label="Private"
                            part={detail.private}
                            whole={total}
                            fillClassName="bg-content-muted"
                        />
                    </Section>
                    <Section title={`Most reviewed over ${range}`}>
                        <GameList games={detail.topGames} noun={["review", "reviews"]} />
                    </Section>
                </>
            );
        }

        case "community":
            return (
                <>
                    <Figures
                        items={[
                            { label: `Replies in ${range}`, value: formatCount(detail.replies) },
                            { label: `Upvotes in ${range}`, value: formatCount(detail.upvotes) },
                        ]}
                    />
                    <Section title={`Replies and threads over ${range}`}>
                        <TrendChart
                            data={series}
                            series={COMMUNITY}
                            bucket={bucket}
                            caption={`Replies and new threads per ${bucket}`}
                            height={160}
                        />
                    </Section>
                    <Section title={`Busiest threads over ${range}`}>
                        {detail.topThreads.length === 0 ? (
                            <p className="text-body-sm text-content-muted">
                                No messages in this period.
                            </p>
                        ) : (
                            <ol className="flex flex-col gap-1">
                                {detail.topThreads.map((thread) => (
                                    <li key={thread.id}>
                                        <Link
                                            to={threadPath(thread.id)}
                                            className="flex min-h-11 items-center justify-between gap-3 rounded-md px-1 hover:bg-surface-hover"
                                        >
                                            <span className="min-w-0 truncate text-body-sm text-content">
                                                {thread.title}
                                            </span>
                                            <span className="shrink-0 font-mono text-label text-content-secondary tabular-nums">
                                                {formatCount(thread.count)}
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </Section>
                </>
            );

        case "games": {
            const total = overview?.totals.games ?? 0;
            return (
                <>
                    <Figures
                        items={[
                            { label: "Games", value: formatCount(total) },
                            { label: `Added in ${range}`, value: formatCount(detail.added) },
                            { label: "Flagged trending", value: formatCount(detail.trending) },
                        ]}
                    />
                    <Section title="How complete the catalogue is">
                        <ShareRow label="Has a cover" part={detail.withCover} whole={total} />
                        <ShareRow label="Has portrait box art" part={detail.withBoxArt} whole={total} />
                        <ShareRow label="Has a description" part={detail.withDescription} whole={total} />
                        <ShareRow
                            label="Details fetched from RAWG"
                            part={detail.detailsSynced}
                            whole={total}
                        />
                    </Section>
                    <Section title="Most logged, ever">
                        <GameList games={detail.mostLogged} noun={["log", "logs"]} />
                    </Section>
                </>
            );
        }
    }
};

const SIGNUPS: Series<"signups">[] = [
    { key: "signups", label: "Sign-ups", color: "var(--color-chart-1)" },
];

const COMMUNITY: Series<"messages" | "threads">[] = [
    { key: "messages", label: "Replies", color: "var(--color-chart-3)" },
    { key: "threads", label: "New threads", color: "var(--color-chart-4)" },
];

/** The detail behind a tile. A bottom sheet on a phone, like every Modal. */
const MetricDetailModal = ({
    metric,
    range,
    overview,
    onClose,
}: {
    metric: AdminMetric;
    range: AdminRange;
    overview: AdminOverview | undefined;
    onClose: () => void;
}) => {
    const titleId = useId();
    const { data, isPending, isError } = useAdminMetric(metric, range);

    return (
        <Modal onClose={onClose} labelledBy={titleId} className="w-full sm:max-w-2xl">
            <div className="flex flex-col gap-6">
                <header className="pr-10">
                    <h2 id={titleId} className="text-section font-semibold text-content">
                        {TITLES[metric]}
                    </h2>
                    <p className="text-body-sm text-content-secondary">
                        Over the last {RANGE_LABELS[range]}, where a period applies.
                    </p>
                </header>
                {isPending && <TextSkeleton lines={6} />}
                {isError && (
                    <p className="text-body-sm text-danger">
                        This didn’t load. Try again in a moment.
                    </p>
                )}
                {data && <Body detail={data} overview={overview} />}
            </div>
        </Modal>
    );
};

export default MetricDetailModal;
