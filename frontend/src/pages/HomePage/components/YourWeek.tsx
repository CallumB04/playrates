import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Flame } from "lucide-react";
import ProfilePicture from "../../../components/ProfilePicture";
import AvatarFrame from "../../../components/progress/AvatarFrame";
import { InviteButton } from "../../../components/progress/Invite";
import Panel from "../../../components/ui/Panel";
import XpBar from "../../../components/progress/XpBar";
import {
    useLeaderboard,
    useProgress,
} from "../../../hooks/queries/useProgress";
import { formatCount } from "../../../lib/format";
import { cn } from "../../../lib/cn";

const Column = ({
    title,
    children,
}: {
    title: string;
    children: ReactNode;
}) => (
    <section className="flex flex-col gap-3 p-4">
        <h3 className="text-label-sm text-content-muted">{title}</h3>
        {children}
    </section>
);

/**
 * This week at a glance: your streak, the week's three tasks and where
 * you stand among friends. The way into /progress for the rest.
 */
const YourWeek = () => {
    const { data } = useProgress();
    const { data: board } = useLeaderboard("week");
    if (!data) return null;
    const top = (board ?? []).slice(0, 3);

    return (
        <Panel
            title="Your week"
            trailing={
                <Link
                    to="/progress"
                    className="relative inline-flex items-center gap-1 text-label font-medium text-brand before:absolute before:-inset-2 before:content-[''] hover:underline"
                >
                    Progress
                    <ArrowRight size={14} aria-hidden />
                </Link>
            }
            // Three columns ruled apart, each under its own small heading.
            bodyClassName="grid divide-y divide-subtle lg:grid-cols-[1fr_1.4fr_1fr] lg:divide-x lg:divide-y-0"
        >
            <Column title="Streak">
                <div className="flex items-center gap-3">
                    <Flame
                        size={22}
                        className={cn(
                            "shrink-0",
                            data.streak.weeks > 0
                                ? "text-accent"
                                : "text-content-muted"
                        )}
                        aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                        <p className="flex items-baseline justify-between gap-2 text-body-sm font-semibold text-content">
                            {data.streak.weeks} week streak
                            <span className="font-mono text-label-sm font-normal text-content-muted">
                                Level {data.level.level}
                            </span>
                        </p>
                        <XpBar
                            level={data.level}
                            labelled={false}
                            size="sm"
                            className="mt-2"
                        />
                        <p className="mt-1 font-mono text-label-sm text-content-muted">
                            {data.streak.thisWeek
                                ? "This week counts"
                                : "Do anything to keep it"}
                        </p>
                    </div>
                </div>
            </Column>

            <Column title="This week's tasks">
                <ul className="flex flex-col gap-2">
                    {data.quests.week.map((q) => (
                        <li key={q.key} className="flex items-center gap-2.5">
                            <span
                                className={cn(
                                    "grid size-5 shrink-0 place-items-center rounded-full border",
                                    q.done
                                        ? "border-action-edge bg-action text-action-ink"
                                        : "border-strong"
                                )}
                            >
                                {q.done && (
                                    <Check
                                        size={12}
                                        strokeWidth={3}
                                        aria-hidden
                                    />
                                )}
                            </span>
                            <span
                                className={cn(
                                    "min-w-0 flex-1 truncate text-body-sm",
                                    q.done
                                        ? "text-content-muted line-through"
                                        : "text-content"
                                )}
                            >
                                {q.label}
                            </span>
                            <span className="font-mono text-label-sm text-content-muted tabular-nums">
                                {q.count}/{q.target}
                            </span>
                        </li>
                    ))}
                </ul>
            </Column>

            <Column title="Friends this week">
                <div className="flex flex-col gap-1.5">
                    {top.length > 1 ? (
                        top.map((r) => (
                            <div
                                key={r.username}
                                className="flex items-center gap-2"
                            >
                                <span className="w-3 font-mono text-label-sm text-content-muted">
                                    {r.rank}
                                </span>
                                <AvatarFrame frame={r.frame} size="sm">
                                    <ProfilePicture
                                        variant="tab"
                                        file={r.avatarUrl ?? ""}
                                        username={r.username}
                                        link={false}
                                    />
                                </AvatarFrame>
                                <span
                                    className={cn(
                                        "min-w-0 flex-1 truncate text-label",
                                        r.isYou
                                            ? "font-semibold text-brand"
                                            : "text-content"
                                    )}
                                >
                                    {r.isYou ? "You" : r.username}
                                </span>
                                <span className="font-mono text-label-sm text-content-muted tabular-nums">
                                    {formatCount(r.xp)}
                                </span>
                            </div>
                        ))
                    ) : (
                        <>
                            <p className="text-label text-content-muted">
                                Add friends to race them for XP each week.
                            </p>
                            <InviteButton className="mt-1 self-start" />
                        </>
                    )}
                </div>
            </Column>
        </Panel>
    );
};

export default YourWeek;
