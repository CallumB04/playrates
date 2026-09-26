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
import {
    GAME_STATUSES,
    PLAYED_STATUSES,
    STATUS_PRESENTATION,
    isDisplayStatus,
} from "../../../constants/gameStatus";
import { cn } from "../../../lib/cn";
import { formatCount } from "../../../lib/format";
import { useAdminMetric } from "../../../hooks/queries/useAdmin";
import BarPlot from "../components/BarPlot";
import { bucketLabel, RANGE_LABELS, share } from "../lib/adminFormat";

const TITLES: Record<AdminMetric, { title: string; sentence: string }> = {
    users: { title: "People", sentence: "Who comes back, and who has only signed up." },
    logs: { title: "Game logs", sentence: "Every shelf, and the games people are putting on them." },
    reviews: { title: "Reviews", sentence: "What gets written, and who gets to read it." },
    community: { title: "Community", sentence: "Replies, votes, and the threads people are in." },
    games: { title: "The catalogue", sentence: "How complete the games are, and which ones people log." },
};

/** The game page's own heading inside a card: a label on a hairline. */
const Section = ({ title, children }: { title: string; children: ReactNode }) => (
    <section>
        <h3 className="border-b border-subtle pb-2 text-label text-content-muted">{title}</h3>
        {children}
    </section>
);

/** Label, bar, count, share: CirculationPlate's row. */
const ShareRow = ({
    label,
    mark,
    part,
    whole,
    fill = "bg-brand",
}: {
    label: string;
    mark?: ReactNode;
    part: number;
    whole: number;
    fill?: string;
}) => (
    <div className="flex items-center gap-3.5 border-b border-subtle py-2.5">
        {mark}
        <span className="w-24 shrink-0 truncate text-body-sm font-medium text-content sm:w-36">{label}</span>
        <Progress
            value={whole === 0 ? 0 : part / whole}
            label={`${label}: ${share(part, whole)}`}
            fillClassName={fill}
            className="min-w-0 flex-1"
        />
        <span className="w-10 shrink-0 text-right font-mono text-body-sm font-semibold text-content sm:w-12">
            {formatCount(part)}
        </span>
        <span className="w-9 shrink-0 text-right font-mono text-[11.5px] text-content-muted sm:w-10">
            {share(part, whole)}
        </span>
    </div>
);

const StatusRow = ({ status, part, whole }: { status: string; part: number; whole: number }) => {
    if (!isDisplayStatus(status)) return <ShareRow label={status} part={part} whole={whole} />;
    const { label, icon: Mark, markTone, accent } = STATUS_PRESENTATION[status];
    return (
        <ShareRow
            label={label}
            mark={<Mark size={14} aria-hidden className={cn("shrink-0", markTone)} />}
            part={part}
            whole={whole}
            fill={accent}
        />
    );
};

/** A band of figures, as a profile has them. */
const Band = ({ children }: { children: ReactNode }) => (
    <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:flex sm:flex-wrap">{children}</div>
);

const Ranked = ({ children }: { children: ReactNode }) => <ol className="flex flex-col py-1">{children}</ol>;

const Rank = ({ n }: { n: number }) => (
    <span
        className={cn(
            "w-5 shrink-0 font-mono text-label-sm",
            n === 1 ? "font-semibold text-brand" : "text-content-muted"
        )}
    >
        #{n}
    </span>
);

const ROW = "flex min-h-11 items-center gap-3 rounded-sm px-1 py-1.5 lift hover:bg-surface-hover";

const Games = ({ games, noun }: { games: AdminRankedGame[]; noun: [string, string] }) =>
    games.length === 0 ? (
        <p className="py-3 text-body-sm text-content-muted">Nothing in this period.</p>
    ) : (
        <Ranked>
            {games.map((game, i) => (
                <li key={game.id}>
                    <Link to={`/game/${game.id}`} className={ROW}>
                        <Rank n={i + 1} />
                        <GameCover
                            coverUrl={game.coverUrl}
                            title={game.title}
                            className="aspect-3/4 w-8 shrink-0 overflow-hidden rounded-xs shadow-cover"
                        />
                        <span className="min-w-0 flex-1 truncate text-body-sm font-medium text-content">
                            {game.title}
                        </span>
                        <span className="shrink-0 text-label-sm text-content-muted">
                            <span className="font-mono text-content-secondary">{formatCount(game.count)}</span>{" "}
                            {game.count === 1 ? noun[0] : noun[1]}
                        </span>
                    </Link>
                </li>
            ))}
        </Ranked>
    );

const Body = ({ detail, overview }: { detail: AdminMetricDetail; overview: AdminOverview | undefined }) => {
    const series = overview?.series ?? [];
    const bucket = overview?.bucket ?? "day";
    const range = overview ? RANGE_LABELS[overview.range] : "the period";

    switch (detail.metric) {
        case "users": {
            const { lastSeen } = detail;
            return (
                <>
                    <Band>
                        <Stat label="Accounts" value={formatCount(lastSeen.total)} />
                        <Stat label="Here right now" value={formatCount(lastSeen.online)} />
                        <Stat label="Finished the welcome" value={share(detail.onboarded, lastSeen.total)} />
                    </Band>
                    <Section title="Last seen">
                        <ShareRow label="In the last day" part={lastSeen.today} whole={lastSeen.total} />
                        <ShareRow label="In the last week" part={lastSeen.week} whole={lastSeen.total} />
                        <ShareRow label="In the last month" part={lastSeen.month} whole={lastSeen.total} />
                    </Section>
                    {series.length > 0 && (
                        <Section title={`Sign-ups over ${range}`}>
                            <div className="pt-3">
                                <BarPlot
                                    bars={series.map((p) => ({ key: p.bucket, segments: [{ key: "v", value: p.signups, className: "bg-brand" }] }))}
                                    label="Sign-ups"
                                    height={56}
                                    describe={(i) => `${bucketLabel(series[i]!.bucket, bucket)}: ${series[i]!.signups} new`}
                                />
                            </div>
                        </Section>
                    )}
                    <Section title={`Busiest over ${range}`}>
                        {detail.mostActive.length === 0 ? (
                            <p className="py-3 text-body-sm text-content-muted">Nobody yet.</p>
                        ) : (
                            <Ranked>
                                {detail.mostActive.map((person, i) => (
                                    <li key={person.username}>
                                        <Link to={`/user/${person.username}`} className={ROW}>
                                            <Rank n={i + 1} />
                                            <span className="shrink-0 [&>*]:size-8">
                                                <ProfilePicture variant="nav" file={person.avatarUrl ?? ""} accent={person.accent} username={person.username} link={false} />
                                            </span>
                                            <span className="min-w-0 flex-1 truncate text-body-sm font-medium text-content">
                                                {person.username}
                                            </span>
                                            <span className="shrink-0 text-label-sm text-content-muted">
                                                <span className="font-mono text-content-secondary">{formatCount(person.count)}</span>{" "}
                                                {person.count === 1 ? "thing done" : "things done"}
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </Ranked>
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
                    <Band>
                        <Stat label="Logs" value={formatCount(total)} />
                        <Stat label="Average rating" value={<RatingBadge value={detail.averageRating} size="md" />} />
                        <Stat
                            label="Carry a rating"
                            value={detail.ratedShare === null ? "—" : `${Math.round(detail.ratedShare * 100)}%`}
                        />
                    </Band>
                    <Section title="Every log · by shelf">
                        {GAME_STATUSES.map((s) => (
                            <StatusRow key={s} status={s} part={detail.byStatus[s] ?? 0} whole={total} />
                        ))}
                    </Section>
                    {played > 0 && (
                        <Section title="How plays ended">
                            {PLAYED_STATUSES.map((s) => (
                                <StatusRow key={s} status={s} part={detail.byPlayedStatus[s] ?? 0} whole={played} />
                            ))}
                        </Section>
                    )}
                    <Section title={`Most logged over ${range}`}>
                        <Games games={detail.topGames} noun={["log", "logs"]} />
                    </Section>
                </>
            );
        }

        case "reviews": {
            const total = detail.public + detail.private;
            return (
                <>
                    <Band>
                        <Stat label="Reviews" value={formatCount(total)} />
                        <Stat label={`Upvotes in ${range}`} value={formatCount(detail.upvotes)} />
                        <Stat label="Behind a spoiler" value={share(detail.spoilers, total)} />
                    </Band>
                    <Section title="Who can read them">
                        <ShareRow label="Everyone" part={detail.public} whole={total} />
                        <ShareRow label="Only the author" part={detail.private} whole={total} fill="bg-content-muted" />
                    </Section>
                    <Section title={`Most reviewed over ${range}`}>
                        <Games games={detail.topGames} noun={["review", "reviews"]} />
                    </Section>
                </>
            );
        }

        case "community":
            return (
                <>
                    <Band>
                        <Stat label={`Replies in ${range}`} value={formatCount(detail.replies)} />
                        <Stat label={`Upvotes in ${range}`} value={formatCount(detail.upvotes)} />
                    </Band>
                    <Section title={`Busiest threads over ${range}`}>
                        {detail.topThreads.length === 0 ? (
                            <p className="py-3 text-body-sm text-content-muted">Nobody posted in this period.</p>
                        ) : (
                            <Ranked>
                                {detail.topThreads.map((thread, i) => (
                                    <li key={thread.id}>
                                        <Link to={threadPath(thread.id)} className={ROW}>
                                            <Rank n={i + 1} />
                                            <span className="min-w-0 flex-1 truncate text-body-sm font-medium text-content">
                                                {thread.title}
                                            </span>
                                            <span className="shrink-0 text-label-sm text-content-muted">
                                                <span className="font-mono text-content-secondary">{formatCount(thread.count)}</span>{" "}
                                                {thread.count === 1 ? "message" : "messages"}
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </Ranked>
                        )}
                    </Section>
                </>
            );

        case "games": {
            const total = overview?.totals.games ?? 0;
            return (
                <>
                    <Band>
                        <Stat label="Games" value={formatCount(total)} />
                        <Stat label={`Arrived in ${range}`} value={formatCount(detail.added)} />
                        <Stat label="Flagged trending" value={formatCount(detail.trending)} />
                    </Band>
                    <Section title="How complete it is">
                        <ShareRow label="Cover" part={detail.withCover} whole={total} />
                        <ShareRow label="Portrait box art" part={detail.withBoxArt} whole={total} />
                        <ShareRow label="Description" part={detail.withDescription} whole={total} />
                        <ShareRow label="Details fetched" part={detail.detailsSynced} whole={total} />
                    </Section>
                    <Section title="Most logged, ever">
                        <Games games={detail.mostLogged} noun={["log", "logs"]} />
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
    const { title, sentence } = TITLES[metric];

    return (
        <Modal onClose={onClose} labelledBy={titleId} className="w-full sm:max-w-2xl">
            <div className="flex flex-col gap-7">
                <header className="pr-10">
                    <h2 id={titleId} className="font-display text-section text-content">
                        {title}
                    </h2>
                    <p className="mt-1.5 text-body-sm text-content-secondary">{sentence}</p>
                </header>
                {isPending && <TextSkeleton lines={6} />}
                {isError && (
                    <p className="text-body-sm text-danger">This didn’t load. Close it and try again.</p>
                )}
                {data && <Body detail={data} overview={overview} />}
            </div>
        </Modal>
    );
};

export default MetricDetailModal;
