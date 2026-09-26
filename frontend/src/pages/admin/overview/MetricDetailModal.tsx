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
import Stat from "../../../components/ui/Stat";
import RatingBadge from "../../../components/ui/RatingBadge";
import { TextSkeleton } from "../../../components/ui/Skeleton";
import GameCover from "../../../components/game/GameCover";
import ProfilePicture from "../../../components/ProfilePicture";
import { threadPath } from "../../../components/community/paths";
import { GAME_STATUSES, PLAYED_STATUSES, STATUS_PRESENTATION } from "../../../constants/gameStatus";
import { cn } from "../../../lib/cn";
import { formatCount } from "../../../lib/format";
import { useAdminMetric, useAdminOverview } from "../../../hooks/queries/useAdmin";
import BarPlot from "../components/BarPlot";
import Heatmap from "../components/Heatmap";
import LinePlot from "../components/LinePlot";
import Proportion from "../components/Proportion";
import { bucketLabel, RANGE_LABELS, share } from "../lib/adminFormat";

const TITLES: Record<AdminMetric, string> = {
    users: "People",
    logs: "Game logs",
    reviews: "Reviews",
    community: "Community",
    games: "The catalogue",
};

/** Lists in a popup stop at five too: past that it's a directory, and the
 *  Users view is that. */
const LIST_MAX = 5;

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
    <section>
        <h3 className="mb-3 border-b border-subtle pb-2 text-label text-content-muted">{title}</h3>
        {children}
    </section>
);

/** Label, bar, count, share: the game page's own breakdown row. */
const ShareRow = ({ label, part, whole }: { label: string; part: number; whole: number }) => (
    <div className="flex items-center gap-3.5 border-b border-subtle py-2.5 last:border-b-0">
        <span className="w-28 shrink-0 truncate text-body-sm font-medium text-content sm:w-36">{label}</span>
        <Progress value={whole === 0 ? 0 : part / whole} label={`${label}: ${share(part, whole)}`} className="min-w-0 flex-1" />
        <span className="w-12 shrink-0 text-right font-mono text-body-sm font-semibold text-content">{formatCount(part)}</span>
        <span className="w-9 shrink-0 text-right font-mono text-[11.5px] text-content-muted">{share(part, whole)}</span>
    </div>
);

const Band = ({ children }: { children: ReactNode }) => (
    <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:flex sm:flex-wrap">{children}</div>
);

const Rank = ({ n }: { n: number }) => (
    <span className={cn("w-5 shrink-0 font-mono text-label-sm", n === 1 ? "font-semibold text-brand" : "text-content-muted")}>
        #{n}
    </span>
);

const ROW = "flex min-h-11 items-center gap-3 rounded-sm px-1 py-1.5 lift hover:bg-surface-hover";

const Count = ({ n, one, many }: { n: number; one: string; many: string }) => (
    <span className="shrink-0 text-label-sm text-content-muted">
        <span className="font-mono text-content-secondary">{formatCount(n)}</span> {n === 1 ? one : many}
    </span>
);

const Games = ({ games, one, many }: { games: AdminRankedGame[]; one: string; many: string }) =>
    games.length === 0 ? (
        <p className="text-body-sm text-content-muted">None in this time.</p>
    ) : (
        <ol>
            {games.slice(0, LIST_MAX).map((game, i) => (
                <li key={game.id}>
                    <Link to={`/game/${game.id}`} className={ROW}>
                        <Rank n={i + 1} />
                        <GameCover coverUrl={game.coverUrl} title={game.title} className="aspect-3/4 w-8 shrink-0 overflow-hidden rounded-xs shadow-cover" />
                        <span className="min-w-0 flex-1 truncate text-body-sm font-medium text-content">{game.title}</span>
                        <Count n={game.count} one={one} many={many} />
                    </Link>
                </li>
            ))}
        </ol>
    );

/** Twelve weeks of daily use, whatever period the overview is on: the habit
 *  only shows over weeks. */
const DailyUse = () => {
    const { data } = useAdminOverview("90d");
    const days = (data?.series ?? []).slice(-84).map((p) => ({ day: p.bucket, value: p.active }));
    if (days.length === 0) return <TextSkeleton lines={3} />;
    return (
        <Heatmap
            days={days}
            label="People who used PlayRates each day, last 12 weeks"
            describe={(d) => `${bucketLabel(d.day, "day")}: ${d.value} ${d.value === 1 ? "person" : "people"}`}
        />
    );
};

const Body = ({ detail, overview }: { detail: AdminMetricDetail; overview: AdminOverview | undefined }) => {
    const series = overview?.series ?? [];
    const bucket = overview?.bucket ?? "day";
    const range = overview ? RANGE_LABELS[overview.range] : "the period";
    const axis = { start: series[0] ? bucketLabel(series[0].bucket, "day") : "", end: bucket === "week" ? "this week" : "today" };

    switch (detail.metric) {
        case "users": {
            const { lastSeen } = detail;
            // Accounts over time: today's total, walked back through each
            // period's sign-ups.
            let running = overview?.totals.users ?? lastSeen.total;
            const accounts = [...series]
                .reverse()
                .map((p) => {
                    const at = running;
                    running -= p.signups;
                    return at;
                })
                .reverse();
            return (
                <>
                    <Band>
                        <Stat label="Accounts" value={formatCount(lastSeen.total)} />
                        <Stat label="Here right now" value={formatCount(lastSeen.online)} />
                        <Stat label="Finished the welcome" value={share(detail.onboarded, lastSeen.total)} />
                    </Band>
                    <Section title="Days people used PlayRates · last 12 weeks">
                        <DailyUse />
                    </Section>
                    <Section title={`Accounts over ${range}`}>
                        <LinePlot
                            series={[{ key: "accounts", label: "Accounts", values: accounts, color: "var(--color-brand)" }]}
                            label="Accounts in total"
                            height={72}
                            describe={(i) => `${bucketLabel(series[i]!.bucket, bucket)}: ${accounts[i]} accounts, ${series[i]!.signups} new`}
                            axis={axis}
                        />
                    </Section>
                    <Section title="Last opened PlayRates">
                        <ShareRow label="Within a day" part={lastSeen.today} whole={lastSeen.total} />
                        <ShareRow label="Within a week" part={lastSeen.week} whole={lastSeen.total} />
                        <ShareRow label="Within a month" part={lastSeen.month} whole={lastSeen.total} />
                    </Section>
                    <Section title={`Most active over ${range} · logs, reviews, posts, votes, friend requests`}>
                        {detail.mostActive.length === 0 ? (
                            <p className="text-body-sm text-content-muted">Nobody yet.</p>
                        ) : (
                            <ol>
                                {detail.mostActive.slice(0, LIST_MAX).map((p, i) => (
                                    <li key={p.username}>
                                        <Link to={`/user/${p.username}`} className={ROW}>
                                            <Rank n={i + 1} />
                                            <span className="shrink-0 [&>*]:size-8">
                                                <ProfilePicture variant="nav" file={p.avatarUrl ?? ""} accent={p.accent} username={p.username} link={false} />
                                            </span>
                                            <span className="min-w-0 flex-1 truncate text-body-sm font-medium text-content">{p.username}</span>
                                            <Count n={p.count} one="action" many="actions" />
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
            return (
                <>
                    <Band>
                        <Stat label="Logs, ever" value={formatCount(total)} />
                        <Stat label="Average rating" value={<RatingBadge value={detail.averageRating} size="md" />} />
                        <Stat label="Have a rating" value={detail.ratedShare === null ? "—" : `${Math.round(detail.ratedShare * 100)}%`} />
                    </Band>
                    <Section title="Where every log sits">
                        <Proportion
                            label="Logs by shelf"
                            parts={GAME_STATUSES.map((s) => ({
                                key: s,
                                label: STATUS_PRESENTATION[s].label,
                                value: detail.byStatus[s] ?? 0,
                                fill: STATUS_PRESENTATION[s].accent,
                            }))}
                        />
                    </Section>
                    <Section title="How played games ended">
                        <Proportion
                            label="Played games by ending"
                            parts={PLAYED_STATUSES.map((s) => ({
                                key: s,
                                label: STATUS_PRESENTATION[s].label,
                                value: detail.byPlayedStatus[s] ?? 0,
                                fill: STATUS_PRESENTATION[s].accent,
                            }))}
                        />
                    </Section>
                    {series.length > 0 && (
                        <Section title={`Logged each ${bucket}`}>
                            <BarPlot
                                bars={series.map((p) => ({ key: p.bucket, segments: [{ key: "v", value: p.logs, className: "bg-brand" }] }))}
                                label={`Games logged each ${bucket}`}
                                height={64}
                                describe={(i) => `${bucketLabel(series[i]!.bucket, bucket)}: ${series[i]!.logs} logged`}
                                axis={axis}
                            />
                        </Section>
                    )}
                    <Section title={`Most logged over ${range}`}>
                        <Games games={detail.topGames} one="log" many="logs" />
                    </Section>
                </>
            );
        }

        case "reviews": {
            const total = detail.public + detail.private;
            return (
                <>
                    <Band>
                        <Stat label="Reviews, ever" value={formatCount(total)} />
                        <Stat label={`Upvotes in ${range}`} value={formatCount(detail.upvotes)} />
                        <Stat label="Hidden behind a spoiler" value={share(detail.spoilers, total)} />
                    </Band>
                    <Section title="Who can read them">
                        <Proportion
                            label="Reviews by who can read them"
                            parts={[
                                { key: "public", label: "Everyone", value: detail.public, fill: "bg-brand" },
                                { key: "private", label: "Only the author", value: detail.private, fill: "bg-content-muted" },
                            ]}
                        />
                    </Section>
                    <Section title={`Most reviewed over ${range}`}>
                        <Games games={detail.topGames} one="review" many="reviews" />
                    </Section>
                </>
            );
        }

        case "community":
            return (
                <>
                    <Band>
                        <Stat label={`Replies to someone, ${range}`} value={formatCount(detail.replies)} />
                        <Stat label={`Upvotes, ${range}`} value={formatCount(detail.upvotes)} />
                    </Band>
                    {series.length > 0 && (
                        <Section title={`Messages each ${bucket}`}>
                            <BarPlot
                                bars={series.map((p) => ({
                                    key: p.bucket,
                                    segments: [
                                        { key: "m", value: p.messages, className: "bg-chart-3" },
                                        { key: "t", value: p.threads, className: "bg-chart-4" },
                                    ],
                                }))}
                                label={`Replies and new threads each ${bucket}`}
                                height={64}
                                describe={(i) => `${bucketLabel(series[i]!.bucket, bucket)}: ${series[i]!.messages} replies, ${series[i]!.threads} new threads`}
                                axis={axis}
                            />
                            <p className="mt-2 flex gap-4 text-label-sm text-content-muted">
                                <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-chart-3" />Replies</span>
                                <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-chart-4" />New threads</span>
                            </p>
                        </Section>
                    )}
                    <Section title={`Busiest threads over ${range}`}>
                        {detail.topThreads.length === 0 ? (
                            <p className="text-body-sm text-content-muted">Nobody posted in this time.</p>
                        ) : (
                            <ol>
                                {detail.topThreads.slice(0, LIST_MAX).map((t, i) => (
                                    <li key={t.id}>
                                        <Link to={threadPath(t.id)} className={ROW}>
                                            <Rank n={i + 1} />
                                            <span className="min-w-0 flex-1 truncate text-body-sm font-medium text-content">{t.title}</span>
                                            <Count n={t.count} one="message" many="messages" />
                                        </Link>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </Section>
                </>
            );

        case "games": {
            const total = detail.total;
            return (
                <>
                    <Band>
                        <Stat label="Games" value={formatCount(total)} />
                        <Stat label={`Arrived in ${range}`} value={formatCount(detail.added)} />
                        <Stat label="On the trending rail" value={formatCount(detail.trending)} />
                    </Band>
                    <Section title="How many have each">
                        <ShareRow label="Cover" part={detail.withCover} whole={total} />
                        <ShareRow label="Portrait box art" part={detail.withBoxArt} whole={total} />
                        <ShareRow label="Description" part={detail.withDescription} whole={total} />
                        <ShareRow label="Details from RAWG" part={detail.detailsSynced} whole={total} />
                    </Section>
                    <Section title="Most logged, ever">
                        <Games games={detail.mostLogged} one="log" many="logs" />
                    </Section>
                </>
            );
        }
    }
};

/** The detail behind a figure. A bottom sheet on a phone, like every Modal. */
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
            <div className="flex flex-col gap-7">
                <h2 id={titleId} className="pr-10 font-display text-section text-content">
                    {TITLES[metric]}
                </h2>
                {isPending && <TextSkeleton lines={6} />}
                {isError && <p className="text-body-sm text-danger">This didn’t load. Close it and try again.</p>}
                {data && <Body detail={data} overview={overview} />}
            </div>
        </Modal>
    );
};

export default MetricDetailModal;
