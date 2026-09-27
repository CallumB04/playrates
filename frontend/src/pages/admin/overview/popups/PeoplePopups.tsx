import { Link } from "react-router-dom";
import type { AdminOverview } from "@playrates/shared";
import Progress from "../../../../components/ui/Progress";
import Stat from "../../../../components/ui/Stat";
import { TextSkeleton } from "../../../../components/ui/Skeleton";
import ProfilePicture from "../../../../components/ProfilePicture";
import { formatCount, formatDate, relativeTime } from "../../../../lib/format";
import {
    useAdminMetric,
    useAdminOverview,
    useAdminUsers,
} from "../../../../hooks/queries/useAdmin";
import BarPlot from "../../components/BarPlot";
import Heatmap from "../../components/Heatmap";
import LinePlot from "../../components/LinePlot";
import { bucketLabel, RANGE_LABELS, share } from "../../lib/adminFormat";
import { addedIn, runningTotal } from "../../lib/plot";
import { Change } from "../Change";
import Popup, { PopupBand, PopupSection } from "./Popup";

interface PopupProps {
    data: AdminOverview;
    onClose: () => void;
}

const axisOf = (data: AdminOverview) => ({
    start: data.series[0] ? bucketLabel(data.series[0].bucket, "day") : "",
    end: data.bucket === "week" ? "this week" : "today",
});

/** Label, bar, count, share: the game page's own breakdown row. */
const ShareRow = ({
    label,
    part,
    whole,
    fill,
}: {
    label: string;
    part: number;
    whole: number;
    fill?: string;
}) => (
    <div className="flex items-center gap-3.5 border-b border-subtle py-2.5 last:border-b-0">
        <span className="w-28 shrink-0 text-body-sm font-medium text-content sm:w-36">
            {label}
        </span>
        <Progress
            value={whole === 0 ? 0 : part / whole}
            label={`${label}: ${share(part, whole)}`}
            fillClassName={fill}
            className="min-w-0 flex-1"
        />
        <span className="w-10 shrink-0 text-right font-mono text-body-sm font-semibold text-content">
            {formatCount(part)}
        </span>
        <span className="w-9 shrink-0 text-right font-mono text-[11.5px] text-content-muted">
            {share(part, whole)}
        </span>
    </div>
);

export const TotalUsersPopup = ({ data, onClose }: PopupProps) => {
    const { series, bucket, totals, period } = data;
    const range = RANGE_LABELS[data.range];
    const accounts = runningTotal(
        totals.users,
        series.map((p) => p.signups)
    );
    const atStart = (accounts[0] ?? totals.users) - (series[0]?.signups ?? 0);

    return (
        <Popup
            title="Total users"
            value={formatCount(totals.users)}
            note={addedIn(period.signups.current, range)}
            onClose={onClose}
        >
            <LinePlot
                series={[
                    {
                        key: "accounts",
                        label: "Accounts",
                        values: accounts,
                        color: "var(--color-brand)",
                    },
                ]}
                label={`Accounts in total over ${range}`}
                height={180}
                describe={(i) =>
                    `${bucketLabel(series[i]!.bucket, bucket)}: ${accounts[i]} accounts`
                }
                readout={(i) => (
                    <span className="flex flex-wrap justify-between gap-x-3">
                        <span>
                            <span className="font-mono text-content">
                                {formatCount(accounts[i]!)}
                            </span>{" "}
                            accounts {bucket === "week" ? "the week of" : "on"}{" "}
                            {bucketLabel(series[i]!.bucket, "day")}
                        </span>
                        <span className="text-content-muted">
                            {series[i]!.signups === 0
                                ? "none joined"
                                : `+${series[i]!.signups} joined`}
                        </span>
                    </span>
                )}
                axis={axisOf(data)}
            />
            <PopupBand>
                <Stat label={`${range} ago`} value={formatCount(atStart)} />
                <Stat
                    label="Joined since"
                    value={formatCount(period.signups.current)}
                />
                <Stat
                    label="Growth"
                    value={
                        atStart === 0
                            ? "—"
                            : `+${Math.round(((totals.users - atStart) / atStart) * 100)}%`
                    }
                />
                <Stat
                    label="Finished the welcome"
                    value={share(totals.onboarded, totals.users)}
                />
            </PopupBand>
        </Popup>
    );
};

/** Twelve weeks of days, whatever period the page is on: a habit only shows
 *  over weeks. */
const DailyUse = () => {
    const { data } = useAdminOverview("90d");
    const days = (data?.series ?? [])
        .slice(-84)
        .map((p) => ({ day: p.bucket, value: p.active }));
    if (days.length === 0) return <TextSkeleton lines={3} />;
    return (
        <Heatmap
            days={days}
            label="People who used PlayRates each day, last 12 weeks"
            tone="teal"
            describe={(d) =>
                `${bucketLabel(d.day, "day")}: ${d.value} ${d.value === 1 ? "person" : "people"}`
            }
        />
    );
};

export const ActiveUsersPopup = ({ data, onClose }: PopupProps) => {
    const { series, bucket, totals } = data;
    const weekly = bucket === "week";
    const { data: users } = useAdminMetric("users", data.range);
    const lastSeen = users?.metric === "users" ? users.lastSeen : null;

    return (
        <Popup
            title="Active users · used PlayRates in the last 7 days"
            value={formatCount(totals.wau)}
            note={<Change figure={data.activeWeek} previous="week" />}
            onClose={onClose}
        >
            <PopupBand>
                <Stat
                    label="Here right now"
                    value={formatCount(totals.online)}
                />
                <Stat label="Today" value={formatCount(totals.dau)} />
                <Stat label="Last 7 days" value={formatCount(totals.wau)} />
                <Stat label="Last 30 days" value={formatCount(totals.mau)} />
            </PopupBand>

            <PopupSection title={`Over ${RANGE_LABELS[data.range]}`}>
                <LinePlot
                    series={[
                        {
                            key: "week",
                            label: weekly ? "That week" : "The 7 days to then",
                            values: series.map((p) =>
                                weekly ? p.active : p.activeWeek
                            ),
                            color: "var(--color-chart-2)",
                        },
                        ...(weekly
                            ? []
                            : [
                                  {
                                      key: "day",
                                      label: "That day alone",
                                      values: series.map((p) => p.active),
                                      color: "var(--color-content-muted)",
                                      quiet: true,
                                  },
                              ]),
                    ]}
                    label={`People who used PlayRates in the 7 days to each ${bucket}`}
                    height={160}
                    describe={(i) =>
                        `${bucketLabel(series[i]!.bucket, bucket)}: ${weekly ? series[i]!.active : series[i]!.activeWeek} people`
                    }
                    readout={(i) => {
                        const n = weekly
                            ? series[i]!.active
                            : series[i]!.activeWeek;
                        return (
                            <span className="flex flex-wrap justify-between gap-x-3">
                                <span>
                                    <span className="font-mono text-content">
                                        {formatCount(n)}
                                    </span>{" "}
                                    {n === 1 ? "person" : "people"}{" "}
                                    {weekly
                                        ? "the week of"
                                        : "in the 7 days to"}{" "}
                                    {bucketLabel(series[i]!.bucket, "day")}
                                </span>
                                {!weekly && (
                                    <span className="text-content-muted">
                                        <span className="font-mono">
                                            {formatCount(series[i]!.active)}
                                        </span>{" "}
                                        that day alone
                                    </span>
                                )}
                            </span>
                        );
                    }}
                    axis={axisOf(data)}
                />
            </PopupSection>

            <PopupSection title="Which days · last 12 weeks">
                <DailyUse />
            </PopupSection>

            <PopupSection title="When each account last opened PlayRates">
                {lastSeen ? (
                    <>
                        <ShareRow
                            fill="bg-chart-2"
                            label="Within a day"
                            part={lastSeen.today}
                            whole={lastSeen.total}
                        />
                        <ShareRow
                            fill="bg-chart-2"
                            label="Within a week"
                            part={lastSeen.week}
                            whole={lastSeen.total}
                        />
                        <ShareRow
                            fill="bg-chart-2"
                            label="Within a month"
                            part={lastSeen.month}
                            whole={lastSeen.total}
                        />
                        <ShareRow
                            fill="bg-chart-2"
                            label="Longer ago"
                            part={lastSeen.total - lastSeen.month}
                            whole={lastSeen.total}
                        />
                    </>
                ) : (
                    <TextSkeleton lines={3} />
                )}
            </PopupSection>
        </Popup>
    );
};

export const SignupsPopup = ({ data, onClose }: PopupProps) => {
    const { series, bucket, period } = data;
    const range = RANGE_LABELS[data.range];
    const { data: newest } = useAdminUsers({ sort: "joined" });
    const joined = newest?.data.slice(0, 5) ?? null;

    return (
        <Popup
            title={`New sign-ups · last ${range}`}
            value={formatCount(period.signups.current)}
            note={<Change figure={period.signups} previous={range} />}
            onClose={onClose}
        >
            <BarPlot
                bars={series.map((p) => ({
                    key: p.bucket,
                    segments: [
                        { key: "v", value: p.signups, className: "bg-chart-4" },
                    ],
                }))}
                label={`New accounts each ${bucket}, over ${range}`}
                empty={`Nobody joined in the last ${range}`}
                height={160}
                describe={(i) =>
                    `${bucketLabel(series[i]!.bucket, bucket)}: ${series[i]!.signups} new ${series[i]!.signups === 1 ? "account" : "accounts"}`
                }
                readout={(i) => (
                    <span>
                        <span className="font-mono text-content">
                            {formatCount(series[i]!.signups)}
                        </span>{" "}
                        {series[i]!.signups === 1 ? "account" : "accounts"} made{" "}
                        {bucket === "week" ? "the week of" : "on"}{" "}
                        {bucketLabel(series[i]!.bucket, "day")}
                    </span>
                )}
                axis={axisOf(data)}
            />

            <PopupSection title="Newest accounts">
                {!joined ? (
                    <TextSkeleton lines={4} />
                ) : (
                    <ul>
                        {joined.map((user) => (
                            <li key={user.id}>
                                <Link
                                    to={`/user/${user.username}`}
                                    className="flex min-h-11 items-center gap-3 rounded-sm px-1 py-1.5 lift hover:bg-surface-hover"
                                >
                                    <span className="shrink-0 [&>*]:size-8">
                                        <ProfilePicture
                                            variant="nav"
                                            file={user.avatarUrl ?? ""}
                                            accent={user.accent}
                                            username={user.username}
                                            link={false}
                                        />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-body-sm font-medium text-content">
                                            {user.username}
                                        </span>
                                        <span className="block text-label-sm text-content-muted">
                                            {user.onboardedAt
                                                ? "Finished the welcome"
                                                : "Hasn’t finished the welcome"}
                                        </span>
                                    </span>
                                    <span className="shrink-0 text-right text-label-sm text-content-muted">
                                        <span className="block text-content-secondary">
                                            {formatDate(user.createdAt)}
                                        </span>
                                        {relativeTime(user.createdAt)}
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </PopupSection>
        </Popup>
    );
};
