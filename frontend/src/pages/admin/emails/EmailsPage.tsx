import type { ReactNode } from "react";
import type { EmailStats } from "@playrates/shared";
import { cardClass } from "../../../components/ui/Card";
import { figureClass } from "../../../components/ui/Figure";
import { Skeleton } from "../../../components/ui/Skeleton";
import { formatCount } from "../../../lib/format";
import { useEmailStats } from "../../../hooks/queries/useAdmin";
import AdminPageHeader from "../components/AdminPageHeader";
import BarPlot from "../components/BarPlot";
import Meter from "../components/Meter";
import RankBars from "../components/RankBars";
import SectionHeader from "../components/SectionHeader";
import { bucketLabel } from "../lib/adminFormat";
import {
    EMAIL_LIMITS,
    accountEmails,
    dailyUsed,
    kindLabel,
    limitTone,
    monthSent,
} from "./emailStatsView";

const shortDate = (day: string) => bucketLabel(day, "day");

const plural = (n: number, one: string, many: string) =>
    `${formatCount(n)} ${n === 1 ? one : many}`;

/** One allowance: how much is gone, against what, and a line on it. */
const Limit = ({
    title,
    used,
    total,
    more = false,
    children,
}: {
    title: string;
    used: number;
    total: number;
    more?: boolean;
    children: ReactNode;
}) => (
    <section aria-label={title} className={cardClass("flex flex-col gap-3")}>
        <h2 className="text-label text-content-muted">{title}</h2>
        <p className="flex items-baseline gap-2">
            <span className={figureClass("display")}>
                {formatCount(used)}
                {more && "+"}
            </span>
            <span className="text-label text-content-muted">
                of {formatCount(total)}
            </span>
        </p>
        <Meter
            used={used}
            total={total}
            tone={limitTone(used, total)}
            label={`${formatCount(used)} of ${formatCount(total)}`}
        />
        <div className="text-label text-content-secondary">{children}</div>
    </section>
);

const Today = ({ stats }: { stats: EmailStats }) => {
    const account = accountEmails(stats);
    const { bounced = 0, complained = 0 } = stats.resend ?? {};
    const { sent, capped, failed } = stats.last24h;
    return (
        <div className="grid gap-4 md:grid-cols-3">
            <Limit
                title="Resend, last 24 hours"
                used={dailyUsed(stats)}
                total={EMAIL_LIMITS.daily}
                more={stats.resend?.more}
            >
                {account === null ? (
                    <p>
                        Resend couldn’t be asked, so account emails aren’t
                        counted.
                    </p>
                ) : (
                    <p>
                        {formatCount(sent)} from PlayRates,{" "}
                        {plural(account, "account email", "account emails")}
                    </p>
                )}
                {(bounced > 0 || complained > 0) && (
                    <p className="text-warning">
                        {formatCount(bounced)} bounced ·{" "}
                        {formatCount(complained)} marked as spam
                    </p>
                )}
            </Limit>
            <Limit
                title="PlayRates’ own, last 24 hours"
                used={sent}
                total={EMAIL_LIMITS.cap}
            >
                {capped > 0 ? (
                    <p className="text-danger">
                        {formatCount(capped)} held back by the cap
                    </p>
                ) : (
                    <p>None held back by the cap</p>
                )}
                {failed > 0 && (
                    <p className="text-danger">
                        {formatCount(failed)} failed to send
                    </p>
                )}
            </Limit>
            <Limit
                title="News subscribers"
                used={stats.newsSubscribers}
                total={EMAIL_LIMITS.contacts}
            >
                <p>
                    {plural(stats.broadcasts.count, "broadcast", "broadcasts")}{" "}
                    in 30 days, to{" "}
                    {plural(stats.broadcasts.recipients, "person", "people")}
                </p>
            </Limit>
        </div>
    );
};

/** Each day's sends, with what the cap held back and what failed. */
const Days = ({ stats }: { stats: EmailStats }) => (
    <section aria-label="Last 30 days">
        <SectionHeader
            title="Last 30 days"
            note={`${formatCount(monthSent(stats))} sent, of ${formatCount(EMAIL_LIMITS.monthly)} a month with account emails`}
        />
        <div className={cardClass()}>
            <BarPlot
                bars={stats.days.map((d) => ({
                    key: d.day,
                    segments: [
                        { key: "sent", value: d.sent, className: "bg-brand" },
                        {
                            key: "capped",
                            value: d.capped,
                            className: "bg-warning",
                        },
                        {
                            key: "failed",
                            value: d.failed,
                            className: "bg-danger",
                        },
                    ],
                }))}
                label="PlayRates’ emails each day, last 30 days"
                height={120}
                marker={{
                    value: EMAIL_LIMITS.cap,
                    label: `The cap, ${EMAIL_LIMITS.cap} a day`,
                }}
                describe={(i) => {
                    const d = stats.days[i]!;
                    return `${shortDate(d.day)}: ${d.sent} sent${d.capped ? `, ${d.capped} held back` : ""}${d.failed ? `, ${d.failed} failed` : ""}`;
                }}
                readout={(i) => {
                    const d = stats.days[i]!;
                    return (
                        <span>
                            <span className="font-mono text-content">
                                {formatCount(d.sent)}
                            </span>{" "}
                            sent on {shortDate(d.day)}
                            {d.capped > 0 && (
                                <span className="text-warning">
                                    {" · "}
                                    <span className="font-mono">
                                        {d.capped}
                                    </span>{" "}
                                    held back
                                </span>
                            )}
                            {d.failed > 0 && (
                                <span className="text-danger">
                                    {" · "}
                                    <span className="font-mono">
                                        {d.failed}
                                    </span>{" "}
                                    failed
                                </span>
                            )}
                        </span>
                    );
                }}
                axis={{
                    start: shortDate(stats.days[0]?.day ?? ""),
                    end: "today",
                }}
            />
        </div>
    </section>
);

const Kinds = ({ stats }: { stats: EmailStats }) => (
    <section aria-label="What went out">
        <SectionHeader title="What went out" note="Last 30 days" />
        <div className={cardClass()}>
            {stats.kinds.length === 0 ? (
                <p className="text-body-sm text-content-muted">Nothing yet.</p>
            ) : (
                <RankBars
                    items={stats.kinds.map((k) => ({
                        key: k.kind,
                        label: kindLabel(k.kind),
                        value: k.sent,
                    }))}
                    unit={["email", "emails"]}
                />
            )}
        </div>
    </section>
);

/**
 * How close email is to Resend's free plan. The daily allowance is the
 * one that bites: PlayRates' own emails stop at the cap, so sign-up
 * confirmations and password resets always have the rest.
 */
const EmailsPage = () => {
    const { data: stats } = useEmailStats();
    return (
        <>
            <AdminPageHeader
                title="Emails"
                description="What PlayRates has emailed, and how close it is to the limits of Resend’s free plan."
            />
            {stats ? (
                <div className="flex flex-col gap-8">
                    <Today stats={stats} />
                    <Days stats={stats} />
                    <Kinds stats={stats} />
                </div>
            ) : (
                <Skeleton className="h-56 rounded-lg" />
            )}
        </>
    );
};

export default EmailsPage;
