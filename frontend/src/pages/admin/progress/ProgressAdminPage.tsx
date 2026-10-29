import type { ReactNode } from "react";
import type { AdminProgress, Metal } from "@playrates/shared";
import ProfilePicture from "../../../components/ProfilePicture";
import BadgeMedal from "../../../components/progress/BadgeMedal";
import ReactionIcon from "../../../components/progress/ReactionIcon";
import { TokenCoin } from "../../../components/progress/TokenAmount";
import { cardClass } from "../../../components/ui/Card";
import EmptyPlate, { EmptyNote } from "../../../components/ui/EmptyPlate";
import { figureClass } from "../../../components/ui/Figure";
import { TextSkeleton } from "../../../components/ui/Skeleton";
import { useAdminProgress } from "../../../hooks/queries/useAdmin";
import { formatCount } from "../../../lib/format";
import AdminPageHeader from "../components/AdminPageHeader";
import RankBars from "../components/RankBars";
import SectionHeader from "../components/SectionHeader";
import {
    badgeRows,
    reactionLabel,
    shopLabel,
    sourceRows,
} from "./progressAdmin";

const METAL_COLUMNS: { metal: Metal; label: string }[] = [
    { metal: 1, label: "Bronze" },
    { metal: 2, label: "Silver" },
    { metal: 3, label: "Gold" },
    { metal: 4, label: "Platinum" },
];

const Stat = ({
    label,
    value,
    note,
}: {
    label: string;
    value: ReactNode;
    note?: ReactNode;
}) => (
    <section className={cardClass("flex min-w-0 flex-col")}>
        <h2 className="text-label text-content-secondary">{label}</h2>
        <p className={figureClass("lg", "mt-2")}>{value}</p>
        {note && <p className="mt-1 text-label text-content-muted">{note}</p>}
    </section>
);

const Panel = ({
    title,
    note,
    children,
}: {
    title: string;
    note?: ReactNode;
    children: ReactNode;
}) => (
    <section className={cardClass("min-w-0")}>
        <SectionHeader title={title} note={note} />
        {children}
    </section>
);

const Badges = ({ badges }: { badges: AdminProgress["badges"] }) => {
    const rows = badgeRows(badges);
    if (rows.length === 0) return <EmptyNote>Nobody holds one yet.</EmptyNote>;
    return (
        // A table wider than a phone scrolls inside its card, not the page.
        <div className="-mx-1 overflow-x-auto px-1">
            <table className="w-full min-w-[28rem] text-body-sm">
                <thead>
                    <tr className="text-label-sm text-content-muted">
                        <th className="py-2 text-left font-normal">Badge</th>
                        {METAL_COLUMNS.map((m) => (
                            <th
                                key={m.metal}
                                className="w-16 py-2 text-right font-normal"
                            >
                                {m.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-subtle">
                    {rows.map((row) => (
                        <tr key={row.badge.key}>
                            <td className="py-2">
                                <span className="flex items-center gap-2.5">
                                    <BadgeMedal
                                        badge={row.badge}
                                        metal={row.top}
                                        size="xs"
                                    />
                                    <span className="truncate text-content">
                                        {row.badge.name}
                                    </span>
                                </span>
                            </td>
                            {row.holders.map((n, i) => (
                                <td
                                    key={i}
                                    className={figureClass(
                                        "label",
                                        n === 0
                                            ? "py-2 text-right text-content-muted"
                                            : "py-2 text-right"
                                    )}
                                >
                                    {n === 0 ? "-" : formatCount(n)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const Body = ({ p }: { p: AdminProgress }) => (
    <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat
                label="XP earned"
                value={formatCount(p.xp.total)}
                note={`${formatCount(p.xp.average)} a member`}
            />
            <Stat
                label="XP this week"
                value={formatCount(p.xp.lastWeek)}
                note="The last 7 days"
            />
            <Stat
                label="Tokens held"
                value={
                    <span className="inline-flex items-center gap-2">
                        <TokenCoin className="size-6" />
                        {formatCount(p.tokens.held)}
                    </span>
                }
                note={`${formatCount(p.tokens.earned)} earned, ${formatCount(p.tokens.spent)} spent`}
            />
            <Stat
                label="Tokens gifted"
                value={formatCount(p.tokens.gifted)}
                note="Spent on friends"
            />
            <Stat
                label="Tasks done"
                value={formatCount(p.tasks.thisWeek)}
                note={`This week, ${formatCount(p.tasks.thisMonth)} this month`}
            />
            <Stat
                label="Invites"
                value={formatCount(p.referrals.joined)}
                note={`Joined, ${formatCount(p.referrals.active)} got going`}
            />
            <Stat
                label="Got started"
                value={formatCount(p.setupDone)}
                note={`Of ${formatCount(p.members)} members`}
            />
            <Stat
                label="Reveal still to see"
                value={formatCount(p.revealWaiting)}
                note="Not back since launch"
            />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Top players">
                {p.topPlayers.length === 0 ? (
                    <EmptyNote>Nobody has XP yet.</EmptyNote>
                ) : (
                    <RankBars
                        unit={["XP", "XP"]}
                        items={p.topPlayers.map((t) => ({
                            key: t.username,
                            label: `${t.username}, level ${t.level}`,
                            href: `/user/${t.username}`,
                            value: t.xp,
                            lead: (
                                <span className="shrink-0 [&>*:first-child]:size-8">
                                    <ProfilePicture
                                        variant="nav"
                                        file={t.avatarUrl ?? ""}
                                        accent={t.accent}
                                        username={t.username}
                                        link={false}
                                    />
                                </span>
                            ),
                        }))}
                    />
                )}
            </Panel>
            <Panel title="Levels" note="Members in each band">
                <RankBars
                    unit={["member", "members"]}
                    items={p.levels.map((l) => ({
                        key: l.label,
                        label: `Level ${l.label}`,
                        value: l.members,
                    }))}
                />
            </Panel>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Where XP comes from" note="The last 30 days">
                {p.xpBySource.length === 0 ? (
                    <EmptyNote>No XP in the last 30 days.</EmptyNote>
                ) : (
                    <RankBars
                        unit={["XP", "XP"]}
                        items={sourceRows(p.xpBySource).map((s) => ({
                            key: s.label,
                            label: s.label,
                            value: s.xp,
                        }))}
                    />
                )}
            </Panel>
            <Panel title="Shop" note="Bought and gifted">
                {p.shop.length === 0 ? (
                    <EmptyNote>Nothing sold yet.</EmptyNote>
                ) : (
                    <RankBars
                        unit={["sold", "sold"]}
                        items={p.shop.map((s) => ({
                            key: s.item,
                            label: `${shopLabel(s.item)}, ${formatCount(s.tokens)} tokens`,
                            value: s.sold,
                        }))}
                    />
                )}
            </Panel>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Panel title="Badges" note="Holders at each metal">
                <Badges badges={p.badges} />
            </Panel>
            <Panel title="Reactions">
                {p.reactions.length === 0 ? (
                    <EmptyNote>No reactions yet.</EmptyNote>
                ) : (
                    <RankBars
                        unit={["use", "uses"]}
                        items={p.reactions.map((r) => ({
                            key: r.reaction,
                            label: reactionLabel(r.reaction),
                            value: r.count,
                            lead: <ReactionIcon reaction={r.reaction} />,
                        }))}
                    />
                )}
            </Panel>
        </div>
    </div>
);

/** How members are getting on with XP, levels, badges and the shop. */
const ProgressAdminPage = () => {
    const progress = useAdminProgress();
    return (
        <>
            <AdminPageHeader
                title="Progress"
                description="XP, levels, badges, tokens and the shop, across every member."
            />
            {progress.isPending ? (
                <div className={cardClass()}>
                    <TextSkeleton lines={5} />
                </div>
            ) : progress.isError || !progress.data ? (
                <EmptyPlate
                    title="Progress didn’t load"
                    body="The API didn’t answer. Try again in a moment."
                />
            ) : (
                <Body p={progress.data} />
            )}
        </>
    );
};

export default ProgressAdminPage;
