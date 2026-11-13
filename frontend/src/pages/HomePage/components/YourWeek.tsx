import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Flame, Trophy } from "lucide-react";
import type { LeaderboardRow, Progress, QuestState } from "@playrates/shared";
import { InviteButton } from "../../../components/progress/Invite";
import { TokenCoin } from "../../../components/progress/TokenAmount";
import XpBar from "../../../components/progress/XpBar";
import { cardClass } from "../../../components/ui/cardClass";
import Skeleton from "../../../components/ui/Skeleton";
import {
    useLeaderboard,
    useProgress,
} from "../../../hooks/queries/useProgress";
import { formatCount, formatOrdinal } from "../../../lib/format";
import { cn } from "../../../lib/cn";
import { questPath } from "../../../lib/questPath";
import { useAuth } from "../../../contexts/AuthContext";

const weeksWord = (n: number) => `${n} ${n === 1 ? "week" : "weeks"}`;

/** Counted in whole days to the end of the week, today included. */
const timeLeft = (end: string) => {
    const days = Math.ceil((new Date(end).getTime() - Date.now()) / 86_400_000);
    if (!Number.isFinite(days)) return null;
    return days <= 1 ? "Ends tonight" : `${days} days left`;
};

/** The card, its header and its link, around whatever the week holds. */
const Frame = ({ end, children }: { end?: string; children: ReactNode }) => {
    const left = end && timeLeft(end);
    return (
        <section className={cardClass("overflow-hidden", { padding: "none" })}>
            <header className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                <h2 className="flex items-baseline gap-2 font-display text-base font-semibold text-content">
                    Your week
                    {left && (
                        <span className="font-sans text-label-sm font-normal text-content-muted">
                            {left}
                        </span>
                    )}
                </h2>
                <Link
                    to="/progress"
                    className="relative inline-flex items-center gap-1 text-label font-medium text-brand-text before:absolute before:-inset-2 before:content-[''] hover:underline"
                >
                    Progress
                    <ArrowRight size={14} aria-hidden />
                </Link>
            </header>
            {children}
        </section>
    );
};

// The streak steps aside on a phone, where three figures to a row crowd.
const FIGURES =
    "grid grid-cols-2 divide-x divide-subtle border-y border-subtle bg-surface-sunken/30 sm:grid-cols-3";

const Figure = ({
    label,
    sub,
    className,
    children,
}: {
    label: string;
    sub: ReactNode;
    className?: string;
    children: ReactNode;
}) => (
    <div
        className={cn(
            "flex min-w-0 flex-col gap-1 px-4 py-3.5 sm:px-5 sm:py-4",
            className
        )}
    >
        <span className="text-label-sm text-content-muted">{label}</span>
        <span className="flex items-center gap-1.5 font-mono text-xl leading-none font-semibold text-content tabular-nums sm:text-2xl">
            {children}
        </span>
        <span className="flex min-h-5 min-w-0 items-center text-label-sm text-content-secondary">
            {sub}
        </span>
    </div>
);

const Reward = ({ quest }: { quest: QuestState }) => (
    <span className="inline-flex items-center gap-2 font-mono text-label-sm text-content-muted tabular-nums">
        <span>+{formatCount(quest.xp)} XP</span>
        {quest.tokens > 0 && (
            <span className="inline-flex items-center gap-1">
                <TokenCoin className="size-3.5" />
                {formatCount(quest.tokens)}
            </span>
        )}
    </span>
);

const Bar = ({ value, className }: { value: number; className?: string }) => (
    <span
        aria-hidden
        className={cn(
            "block h-1.5 overflow-hidden rounded-full bg-surface-sunken",
            className
        )}
    >
        <span
            className="block h-full rounded-full bg-brand"
            style={{ width: `${Math.round(Math.min(1, value) * 100)}%` }}
        />
    </span>
);

const Task = ({ quest, username }: { quest: QuestState; username: string }) => {
    const share = quest.target ? quest.count / quest.target : 0;
    return (
        <li className="relative flex items-center gap-3 px-4 py-3 sm:px-5">
            <span
                className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-full border",
                    quest.done
                        ? "border-action-edge bg-action text-action-ink"
                        : "border-strong"
                )}
            >
                {quest.done && <Check size={12} strokeWidth={3} aria-hidden />}
            </span>
            <div className="min-w-0 flex-1">
                {quest.done ? (
                    <p className="truncate text-body-sm text-content-muted line-through">
                        {quest.label}
                    </p>
                ) : (
                    // The whole row answers the press, not just the words.
                    <Link
                        to={questPath(quest.key, username) ?? "/progress"}
                        className="block truncate text-body-sm text-content before:absolute before:inset-0 before:content-[''] hover:underline"
                    >
                        {quest.label}
                    </Link>
                )}
                <Bar value={share} className="mt-1.5 sm:hidden" />
            </div>
            <Bar value={share} className="hidden w-32 sm:block" />
            <span className="w-8 text-right font-mono text-label-sm text-content-secondary tabular-nums">
                {quest.count}/{quest.target}
            </span>
            <span className="hidden w-24 justify-end sm:flex">
                <Reward quest={quest} />
            </span>
        </li>
    );
};

/**
 * This week in three figures (the streak, the level and your place among
 * friends) over the week's tasks. The way into /progress for the rest.
 */
export const WeekCard = ({
    username,
    progress,
    board,
}: {
    username: string;
    progress: Progress;
    /** Undefined while it loads. */
    board: LeaderboardRow[] | undefined;
}) => {
    const { streak, level } = progress;
    const you = board?.find((row) => row.isYou);
    // A board of one is you alone.
    const friendless = board !== undefined && board.length < 2;

    return (
        <Frame end={progress.periods.week.end}>
            <div className={FIGURES}>
                <Figure
                    label="Streak"
                    sub={`Longest: ${weeksWord(streak.best)}`}
                    className="max-sm:hidden"
                >
                    <Flame
                        size={18}
                        aria-hidden
                        className={
                            streak.weeks > 0
                                ? "text-accent"
                                : "text-content-muted"
                        }
                    />
                    {streak.weeks}
                    <span className="font-sans text-label-sm font-normal text-content-secondary">
                        {streak.weeks === 1 ? "week" : "weeks"}
                    </span>
                </Figure>
                <Figure
                    label="Level"
                    sub={
                        <span className="flex min-w-0 items-center gap-2">
                            <XpBar
                                level={level}
                                labelled={false}
                                size="sm"
                                className="w-12 shrink-0 sm:w-16"
                            />
                            <span className="truncate">
                                {level.next === null
                                    ? "Top level"
                                    : `${formatCount(level.next - level.xp)} XP to go`}
                            </span>
                        </span>
                    }
                >
                    {level.level}
                </Figure>
                <Figure
                    label="Among friends"
                    sub={
                        board === undefined ? (
                            <Skeleton className="h-3 w-20" />
                        ) : friendless ? (
                            <InviteButton className="text-label-sm" />
                        ) : (
                            `of ${formatCount(board.length)} this week`
                        )
                    }
                >
                    <Trophy
                        size={16}
                        aria-hidden
                        className="text-status-played"
                    />
                    {board === undefined ? (
                        <Skeleton className="h-[1em] w-10" />
                    ) : you && !friendless ? (
                        formatOrdinal(you.rank)
                    ) : (
                        "–"
                    )}
                </Figure>
            </div>
            <ul className="divide-y divide-subtle">
                {progress.quests.week.map((quest) => (
                    <Task key={quest.key} quest={quest} username={username} />
                ))}
            </ul>
        </Frame>
    );
};

/** The card's outline while the week loads. */
const WeekSkeleton = () => (
    <Frame>
        <div aria-busy className={FIGURES}>
            {["Streak", "Level", "Among friends"].map((label, i) => (
                <Figure
                    key={label}
                    label={label}
                    sub={<Skeleton className="h-3 w-20" />}
                    className={i === 0 ? "max-sm:hidden" : undefined}
                >
                    <Skeleton className="h-[1em] w-10" />
                </Figure>
            ))}
        </div>
        <ul aria-hidden className="divide-y divide-subtle">
            {[0, 1, 2].map((i) => (
                <li
                    key={i}
                    className="flex items-center gap-3 px-4 py-3 sm:px-5"
                >
                    <Skeleton round className="size-5 shrink-0" />
                    <Skeleton
                        className={cn("h-3", i % 2 ? "w-1/4" : "w-1/3")}
                    />
                    <span className="flex-1" />
                    <Skeleton className="h-3 w-8" />
                </li>
            ))}
        </ul>
    </Frame>
);

const YourWeek = () => {
    const { user, session } = useAuth();
    const { data } = useProgress();
    const { data: board, isPending } = useLeaderboard("week");
    if (!session) return null;
    if (!data || !user) return <WeekSkeleton />;
    return (
        <WeekCard
            username={user.username}
            progress={data}
            // A board that failed to load reads as no friends, not loading.
            board={isPending ? undefined : (board ?? [])}
        />
    );
};

export default YourWeek;
