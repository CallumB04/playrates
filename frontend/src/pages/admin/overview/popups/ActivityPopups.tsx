import type { AdminOverview, AdminSeriesPoint } from "@playrates/shared";
import Stat from "../../../../components/ui/Stat";
import RatingBadge from "../../../../components/ui/RatingBadge";
import { TextSkeleton } from "../../../../components/ui/Skeleton";
import GameCover from "../../../../components/game/GameCover";
import { threadPath } from "../../../../components/community/paths";
import {
    GAME_STATUSES,
    PLAYED_STATUSES,
    STATUS_PRESENTATION,
} from "../../../../constants/gameStatus";
import { formatCount } from "../../../../lib/format";
import { useAdminMetric } from "../../../../hooks/queries/useAdmin";
import BarPlot from "../../components/BarPlot";
import Proportion from "../../components/Proportion";
import RankBars from "../../components/RankBars";
import { bucketLabel, RANGE_LABELS, share } from "../../lib/adminFormat";
import { Change } from "../Change";
import Popup, { PopupBand, PopupSection } from "./Popup";

interface PopupProps {
    data: AdminOverview;
    onClose: () => void;
}

/** The card's own bars, larger and readable day by day. */
const PerBucket = ({
    data,
    pick,
    one,
    many,
    fill = "bg-brand",
}: {
    data: AdminOverview;
    pick: (p: AdminSeriesPoint) => number;
    one: string;
    many: string;
    fill?: string;
}) => {
    const { series, bucket } = data;
    return (
        <BarPlot
            empty={`No ${many} in the last ${RANGE_LABELS[data.range]}`}
            bars={series.map((p) => ({
                key: p.bucket,
                segments: [{ key: "v", value: pick(p), className: fill }],
            }))}
            label={`${many} each ${bucket}, over ${RANGE_LABELS[data.range]}`}
            height={150}
            describe={(i) =>
                `${bucketLabel(series[i]!.bucket, bucket)}: ${pick(series[i]!)} ${pick(series[i]!) === 1 ? one : many}`
            }
            readout={(i) => (
                <span>
                    <span className="font-mono text-content">
                        {formatCount(pick(series[i]!))}
                    </span>{" "}
                    {pick(series[i]!) === 1 ? one : many}{" "}
                    {bucket === "week" ? "the week of" : "on"}{" "}
                    {bucketLabel(series[i]!.bucket, "day")}
                </span>
            )}
            axis={{
                start: series[0] ? bucketLabel(series[0].bucket, "day") : "",
                end: bucket === "week" ? "this week" : "today",
            }}
        />
    );
};

const cover = (url: string | null, title: string) => (
    <GameCover
        coverUrl={url}
        title={title}
        className="aspect-3/4 w-8 shrink-0 overflow-hidden rounded-xs shadow-cover"
    />
);

export const LogsPopup = ({ data, onClose }: PopupProps) => {
    const range = RANGE_LABELS[data.range];
    const { data: detail } = useAdminMetric("logs", data.range);
    const logs = detail?.metric === "logs" ? detail : null;
    const total = logs
        ? Object.values(logs.byStatus).reduce((a, b) => a + b, 0)
        : 0;

    return (
        <Popup
            title={`Games logged · last ${range}`}
            value={formatCount(data.period.logs.current)}
            note={<Change figure={data.period.logs} previous={range} />}
            onClose={onClose}
        >
            <PerBucket
                data={data}
                pick={(p) => p.logs}
                one="game logged"
                many="games logged"
                fill="bg-chart-1"
            />
            {!logs ? (
                <TextSkeleton lines={5} />
            ) : (
                <>
                    <PopupBand>
                        <Stat label="Logs, ever" value={formatCount(total)} />
                        <Stat
                            label="Average rating"
                            value={
                                <RatingBadge
                                    value={logs.averageRating}
                                    size="md"
                                />
                            }
                        />
                        <Stat
                            label="Rated"
                            value={
                                logs.ratedShare === null
                                    ? "—"
                                    : `${Math.round(logs.ratedShare * 100)}%`
                            }
                        />
                    </PopupBand>
                    <PopupSection title="Which shelf every log is on">
                        <Proportion
                            label="Logs by shelf"
                            parts={GAME_STATUSES.map((s) => ({
                                key: s,
                                label: STATUS_PRESENTATION[s].label,
                                value: logs.byStatus[s] ?? 0,
                                fill: STATUS_PRESENTATION[s].accent,
                            }))}
                        />
                    </PopupSection>
                    <PopupSection title="How played games ended">
                        <Proportion
                            label="Played games by how they ended"
                            parts={PLAYED_STATUSES.map((s) => ({
                                key: s,
                                label: STATUS_PRESENTATION[s].label,
                                value: logs.byPlayedStatus[s] ?? 0,
                                fill: STATUS_PRESENTATION[s].accent,
                            }))}
                        />
                    </PopupSection>
                </>
            )}
        </Popup>
    );
};

export const ReviewsPopup = ({ data, onClose }: PopupProps) => {
    const range = RANGE_LABELS[data.range];
    const { data: detail } = useAdminMetric("reviews", data.range);
    const reviews = detail?.metric === "reviews" ? detail : null;
    const total = reviews ? reviews.public + reviews.private : 0;

    return (
        <Popup
            title={`Reviews written · last ${range}`}
            value={formatCount(data.period.reviews.current)}
            note={<Change figure={data.period.reviews} previous={range} />}
            onClose={onClose}
        >
            {total > 0 && (
                <PerBucket
                    data={data}
                    pick={(p) => p.reviews}
                    one="review"
                    many="reviews"
                    fill="bg-chart-2"
                />
            )}
            {!reviews ? (
                <TextSkeleton lines={4} />
            ) : total === 0 ? (
                <p className="text-body-sm text-content-muted">
                    Nobody has written a review yet.
                </p>
            ) : (
                <>
                    <PopupBand>
                        <Stat
                            label="Reviews, ever"
                            value={formatCount(total)}
                        />
                        <Stat
                            label={`Upvotes, last ${range}`}
                            value={formatCount(reviews.upvotes)}
                        />
                        <Stat
                            label="Marked as spoilers"
                            value={share(reviews.spoilers, total)}
                        />
                    </PopupBand>
                    <PopupSection title="Who can read them">
                        <Proportion
                            label="Reviews by who can read them"
                            parts={[
                                {
                                    key: "public",
                                    label: "Everyone",
                                    value: reviews.public,
                                    fill: "bg-chart-2",
                                },
                                {
                                    key: "private",
                                    label: "Only the author",
                                    value: reviews.private,
                                    fill: "bg-content-muted",
                                },
                            ]}
                        />
                    </PopupSection>
                    <PopupSection title={`Most reviewed, last ${range}`}>
                        {reviews.topGames.length === 0 ? (
                            <p className="text-body-sm text-content-muted">
                                Nothing reviewed in this time.
                            </p>
                        ) : (
                            <RankBars
                                unit={["review", "reviews"]}
                                fills={["bg-chart-2", "bg-chart-2/55"]}
                                items={reviews.topGames
                                    .slice(0, 5)
                                    .map((g) => ({
                                        key: String(g.id),
                                        label: g.title,
                                        value: g.count,
                                        lead: cover(g.coverUrl, g.title),
                                        href: `/game/${g.id}`,
                                    }))}
                            />
                        )}
                    </PopupSection>
                </>
            )}
        </Popup>
    );
};

export const RepliesPopup = ({ data, onClose }: PopupProps) => {
    const range = RANGE_LABELS[data.range];
    const { series, bucket } = data;
    const { data: detail } = useAdminMetric("community", data.range);
    const community = detail?.metric === "community" ? detail : null;

    return (
        <Popup
            title={`Community replies · last ${range}`}
            value={formatCount(data.period.messages.current)}
            note={<Change figure={data.period.messages} previous={range} />}
            onClose={onClose}
        >
            <div className="flex flex-col gap-2">
                <BarPlot
                    bars={series.map((p) => ({
                        key: p.bucket,
                        segments: [
                            {
                                key: "replies",
                                value: p.messages,
                                className: "bg-chart-3",
                            },
                            {
                                key: "threads",
                                value: p.threads,
                                className: "bg-chart-4",
                            },
                        ],
                    }))}
                    label={`Replies and new threads each ${bucket}`}
                    empty={`No replies or threads in the last ${range}`}
                    height={150}
                    describe={(i) =>
                        `${bucketLabel(series[i]!.bucket, bucket)}: ${series[i]!.messages} replies, ${series[i]!.threads} new threads`
                    }
                    readout={(i) => (
                        <span className="flex flex-wrap gap-x-3">
                            <span className="text-content">
                                {bucketLabel(series[i]!.bucket, bucket)}
                            </span>
                            <span>
                                <span className="font-mono text-content">
                                    {series[i]!.messages}
                                </span>{" "}
                                {series[i]!.messages === 1
                                    ? "reply"
                                    : "replies"}
                            </span>
                            <span>
                                <span className="font-mono text-content">
                                    {series[i]!.threads}
                                </span>{" "}
                                new{" "}
                                {series[i]!.threads === 1
                                    ? "thread"
                                    : "threads"}
                            </span>
                        </span>
                    )}
                    axis={{
                        start: series[0]
                            ? bucketLabel(series[0].bucket, "day")
                            : "",
                        end: bucket === "week" ? "this week" : "today",
                    }}
                />
                {series.some((p) => p.messages + p.threads > 0) && (
                    <p className="flex gap-4 text-label-sm text-content-muted">
                        <span className="flex items-center gap-1.5">
                            <span className="size-2 rounded-full bg-chart-3" />
                            Replies
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="size-2 rounded-full bg-chart-4" />
                            New threads
                        </span>
                    </p>
                )}
            </div>
            {!community ? (
                <TextSkeleton lines={4} />
            ) : (
                <>
                    <PopupBand>
                        <Stat
                            label="New threads"
                            value={formatCount(data.period.threads.current)}
                        />
                        <Stat
                            label="Answering one post"
                            value={formatCount(community.replies)}
                        />
                        <Stat
                            label="Upvotes"
                            value={formatCount(community.upvotes)}
                        />
                    </PopupBand>
                    <PopupSection title={`Busiest threads, last ${range}`}>
                        {community.topThreads.length === 0 ? (
                            <p className="text-body-sm text-content-muted">
                                Nobody posted in this time.
                            </p>
                        ) : (
                            <RankBars
                                unit={["reply", "replies"]}
                                fills={["bg-chart-3", "bg-chart-3/55"]}
                                items={community.topThreads
                                    .slice(0, 5)
                                    .map((t) => ({
                                        key: String(t.id),
                                        label: t.title,
                                        value: t.count,
                                        href: threadPath(t.id),
                                    }))}
                            />
                        )}
                    </PopupSection>
                </>
            )}
        </Popup>
    );
};
