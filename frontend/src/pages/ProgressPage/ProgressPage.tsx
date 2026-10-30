import { useState, type ReactNode } from "react";
import { Link, Navigate } from "react-router-dom";
import {
    Award,
    Check,
    Flame,
    ListChecks,
    Lock,
    ShieldCheck,
    RefreshCw,
    Store,
} from "lucide-react";
import {
    CARD_THEMES,
    FRAMES,
    NAME_COLOURS,
    NAME_FONTS,
    NO_FRAME,
    REACTIONS,
    type CardThemeKey,
    type FrameKey,
    type LeaderboardPeriod,
    type NameColourKey,
    type NameFontKey,
    type Progress,
    type QuestState,
    type ShopEntry,
} from "@playrates/shared";
import { ApiError } from "../../api";
import Panel from "../../components/ui/Panel";
import { cardClass } from "../../components/ui/Card";
import AsideCard from "../../components/ui/AsideCard";
import { buttonClass } from "../../components/ui/Button";
import SegmentedChoice from "../../components/ui/SegmentedChoice";
import { Skeleton } from "../../components/ui/Skeleton";
import ProfilePicture from "../../components/ProfilePicture";
import AvatarFrame from "../../components/progress/AvatarFrame";
import NameText from "../../components/progress/NameText";
import PlayerCardMock from "../../components/progress/PlayerCardMock";
import { TokenCoin } from "../../components/progress/TokenAmount";
import XpBar from "../../components/progress/XpBar";
import XpInfo from "../../components/progress/XpInfo";
import { nextReward } from "../../components/progress/rewardText";
import { questPath } from "../../lib/questPath";
import { InviteCard } from "../../components/progress/Invite";
import ItemSheet, { ItemSheetFor } from "../../components/shop/ItemSheet";
import { usePins } from "../ProfilePage/lib/usePinReviews";
import { useAuth } from "../../contexts/AuthContext";
import { useNotify } from "../../contexts/NotificationContext";
import {
    useLeaderboard,
    usePlayerBadges,
    useProgress,
    useSetStyle,
    useSwapQuest,
    useShop,
} from "../../hooks/queries/useProgress";
import { useUserLists } from "../../hooks/queries/useLists";
import ReactionIcon from "../../components/progress/ReactionIcon";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useScrollToHash } from "../../hooks/useScrollToHash";
import { formatCount } from "../../lib/format";
import { profilePath } from "../../lib/profilePaths";
import { cn } from "../../lib/cn";

const daysLeft = (end: string) =>
    Math.max(1, Math.ceil((Date.parse(end) - Date.now()) / 86_400_000));

const DAY_MONTH = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
});

/** Your progress in one place: level, tasks, streak, friends, and how you
 *  look. */
const ProgressPage = () => {
    const { user, isLoading: authLoading } = useAuth();
    const { data } = useProgress();
    usePageMeta({ title: "Your progress", noindex: true });
    useScrollToHash();

    if (!authLoading && !user) return <Navigate to="/" replace />;
    if (!data || !user) {
        return (
            <div className="flex flex-col gap-6">
                <Skeleton className="h-40 rounded-lg" />
                <Skeleton className="h-72 rounded-lg" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 lg:gap-8">
            <Header data={data} />
            {/* One column on a phone, in the order of what brings you back:
                tasks, streak and friends before the long list of looks. The
                columns dissolve there so their cards can be ordered. */}
            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6">
                <div className="flex min-w-0 flex-col gap-4 max-lg:contents lg:gap-6">
                    <Tasks data={data} />
                    <div className="min-w-0 max-lg:order-last">
                        <Look data={data} />
                    </div>
                </div>
                <aside className="flex min-w-0 flex-col gap-4 max-lg:contents lg:gap-6">
                    <div id="streak" className="scroll-mt-24">
                        <Streak data={data} />
                    </div>
                    <Leaderboard />
                    <InviteCard />
                </aside>
            </div>
        </div>
    );
};

/* -------------------------------------------------------------- header */

const Header = ({ data }: { data: Progress }) => {
    const { user } = useAuth();
    const { data: badges } = usePlayerBadges(user?.username ?? "", !!user);
    if (!user) return null;
    const reward = nextReward(data.level.level);
    const tasks = [...data.quests.week, ...data.quests.month];

    return (
        // No card: a page's own header sits on the page.
        <header className="flex flex-col gap-5">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
                <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-6">
                    <AvatarFrame
                        frame={data.frame}
                        size="xl"
                        className="shrink-0"
                    >
                        <ProfilePicture
                            variant="profileHeader"
                            file={user.avatarUrl ?? ""}
                            username={user.username}
                            accent={user.accent}
                            link={false}
                        />
                    </AvatarFrame>
                    <div className="min-w-0 flex-1">
                        <p className="font-mono text-label-sm tracking-[0.2em] text-content-muted uppercase">
                            Your progress
                        </p>
                        <h1 className="mt-2 flex items-baseline gap-2 font-display leading-none font-bold text-content sm:mt-3">
                            <span className="text-[22px] text-content-secondary sm:text-[28px]">
                                Level
                            </span>
                            <span className="text-[44px] tracking-tight sm:text-[64px]">
                                {data.level.level}
                            </span>
                        </h1>
                        <div className="mt-2 flex max-w-xl items-start gap-2">
                            <XpBar level={data.level} className="flex-1" />
                            {/* Centred on the bar rather than the bar and
                                its labels together. */}
                            <div className="-mt-[7px]">
                                <XpInfo />
                            </div>
                        </div>
                        {reward && (
                            <p className="mt-1 text-label-sm text-content-muted">
                                Level {reward.level} unlocks {reward.phrase}
                            </p>
                        )}
                    </div>
                </div>

                <Link
                    to="/shop"
                    className={buttonClass(
                        "secondary",
                        "w-full gap-2 sm:w-auto sm:self-start",
                        "md"
                    )}
                >
                    <Store size={16} aria-hidden />
                    Shop
                </Link>
            </div>

            <ul
                aria-label="At a glance"
                className={cardClass(
                    "grid grid-cols-4 divide-x divide-subtle overflow-hidden",
                    { padding: "none" }
                )}
            >
                <Figure
                    icon={<TokenCoin className="size-3.5" />}
                    label="Tokens"
                    value={formatCount(data.tokens)}
                    to="/shop"
                />
                <Figure
                    icon={
                        <Flame size={14} aria-hidden className="text-accent" />
                    }
                    label="Streak"
                    longLabel="Week streak"
                    value={data.streak.weeks}
                />
                <Figure
                    icon={
                        <Award size={14} aria-hidden className="text-brand" />
                    }
                    label="Badges"
                    value={badges ? badges.held.length : "…"}
                    to={profilePath(user.username, "badges")}
                />
                <Figure
                    icon={
                        <ListChecks
                            size={14}
                            aria-hidden
                            className="text-action"
                        />
                    }
                    label="Tasks"
                    longLabel="Tasks done"
                    value={`${tasks.filter((t) => t.done).length}/${tasks.length}`}
                />
            </ul>
        </header>
    );
};

/** One figure in the band under the header, the way the home page lays out
 *  your shelves: the label over the number, divided by hairlines. */
const Figure = ({
    icon,
    label,
    longLabel,
    value,
    to,
}: {
    icon: ReactNode;
    label: string;
    /** Where there's room for it; a phone gets the short one. */
    longLabel?: string;
    value: ReactNode;
    to?: string;
}) => {
    const body = (
        <>
            <span className="flex items-center gap-1.5 text-label-sm text-content-muted group-hover:text-content-secondary lg:text-label">
                {icon}
                {longLabel ? (
                    <>
                        <span className="sm:hidden">{label}</span>
                        <span className="hidden sm:inline">{longLabel}</span>
                    </>
                ) : (
                    label
                )}
            </span>
            <span className="font-mono text-lg leading-none font-medium text-content tabular-nums sm:text-xl lg:text-[28px]">
                {value}
            </span>
        </>
    );
    const className =
        "flex min-h-11 flex-col items-center justify-center gap-1.5 px-1 py-3 sm:items-start sm:gap-2 sm:px-4 lg:px-5 lg:py-4";
    return (
        <li>
            {to ? (
                <Link
                    to={to}
                    className={cn(
                        className,
                        "group h-full transition-colors hover:bg-surface-hover/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
                    )}
                >
                    {body}
                </Link>
            ) : (
                <div className={cn(className, "h-full")}>{body}</div>
            )}
        </li>
    );
};

/* --------------------------------------------------------------- tasks */

const Tasks = ({ data }: { data: Progress }) => (
    <Panel title="Tasks" bodyClassName="flex flex-col gap-4 p-4">
        <TaskGroup
            title="This week"
            tasks={data.quests.week}
            days={daysLeft(data.periods.week.end)}
            swapsLeft={data.quests.swapsLeft}
        />
        <TaskGroup
            title="This month"
            tasks={data.quests.month}
            days={daysLeft(data.periods.month.end)}
        />
    </Panel>
);

const TaskGroup = ({
    title,
    tasks,
    days,
    swapsLeft = 0,
}: {
    title: string;
    tasks: QuestState[];
    days: number;
    /** Weekly only: one undone task a week can be traded for another. */
    swapsLeft?: number;
}) => (
    <section>
        <h3 className="flex items-baseline justify-between gap-3 text-label">
            <span className="font-semibold text-content">{title}</span>
            <span className="font-mono text-label-sm text-content-muted">
                {days} {days === 1 ? "day" : "days"} left
            </span>
        </h3>
        <ul className="mt-1 divide-y divide-subtle">
            {tasks.map((q) => (
                <TaskRow key={q.key} task={q} canSwap={swapsLeft > 0} />
            ))}
        </ul>
    </section>
);

const TaskRow = ({
    task: q,
    canSwap = false,
}: {
    task: QuestState;
    canSwap?: boolean;
}) => {
    const { user } = useAuth();
    const notify = useNotify();
    const swap = useSwapQuest();
    const to = !q.done && user ? questPath(q.key, user.username) : null;
    return (
        <li className="relative flex min-h-14 items-center gap-3 py-2.5">
            <span
                className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-full",
                    q.done ? "bg-action text-action-ink" : "ring-1 ring-strong"
                )}
            >
                {q.done && <Check size={12} strokeWidth={3} aria-hidden />}
            </span>
            <span className="min-w-0 flex-1">
                {/* The whole row goes there; the name is the link. */}
                {to ? (
                    <Link
                        to={to}
                        className="block text-body-sm text-content before:absolute before:inset-0 before:content-[''] hover:underline sm:truncate"
                    >
                        {q.label}
                    </Link>
                ) : (
                    <span
                        className={cn(
                            "block text-body-sm text-content sm:truncate",
                            q.done && "text-content-muted line-through"
                        )}
                    >
                        {q.label}
                    </span>
                )}
                <span className="mt-1.5 flex items-center gap-2">
                    <span className="h-1 w-24 overflow-hidden rounded-full bg-surface-sunken">
                        <span
                            className={cn(
                                "block h-full rounded-full",
                                q.done ? "bg-action" : "bg-brand"
                            )}
                            style={{ width: `${(q.count / q.target) * 100}%` }}
                        />
                    </span>
                    <span className="font-mono text-[11px] text-content-muted tabular-nums">
                        {q.count}/{q.target}
                    </span>
                </span>
            </span>
            <span
                className={cn(
                    "flex shrink-0 flex-col items-end gap-0.5 font-mono tabular-nums",
                    q.done ? "text-content-muted" : "text-content"
                )}
            >
                <span
                    className={cn(
                        "text-label font-semibold",
                        !q.done && "text-brand"
                    )}
                >
                    +{q.xp} XP
                </span>
                <span
                    className="inline-flex items-center gap-1 text-label-sm"
                    aria-label={`and ${q.tokens} tokens`}
                >
                    +{q.tokens}
                    <TokenCoin className="size-3.5" />
                </span>
            </span>
            {/* Over the row's link, which covers the rest of it. */}
            {canSwap && !q.done && !q.swapped && (
                <button
                    type="button"
                    onClick={() =>
                        swap.mutate(q.slot, {
                            onError: (error) =>
                                notify(
                                    error instanceof ApiError
                                        ? error.message
                                        : "Couldn't swap that task",
                                    "error"
                                ),
                        })
                    }
                    disabled={swap.isPending}
                    aria-label={`Swap ${q.label} for another task`}
                    className={buttonClass(
                        "ghost",
                        "relative z-10 -mr-1 min-h-11 gap-1 px-2 sm:min-h-8",
                        "sm"
                    )}
                >
                    <RefreshCw size={13} aria-hidden />
                    Swap
                </button>
            )}
        </li>
    );
};

/* -------------------------------------------------------------- streak */

const MONTH = new Intl.DateTimeFormat("en-GB", { month: "short" });

const Streak = ({ data }: { data: Progress }) => {
    const { streak } = data;
    // From Friday, a week still empty says so.
    const atRisk =
        !streak.thisWeek && streak.weeks > 0 && new Date().getDay() >= 5;
    // Columns by month, as a contribution graph has them by week.
    const months: { label: string; weeks: typeof streak.history }[] = [];
    for (const w of streak.history) {
        const label = MONTH.format(new Date(`${w.week}T12:00:00`)).slice(0, 3);
        const last = months.at(-1);
        if (last?.label === label) last.weeks.push(w);
        else months.push({ label, weeks: [w] });
    }
    const current = streak.history.at(-1)?.week;
    const back = DAY_MONTH.format(new Date(data.periods.month.end));

    return (
        <AsideCard title="Streak">
            <div className="flex items-baseline gap-2">
                <Flame
                    size={20}
                    className={cn(
                        "self-center",
                        streak.weeks > 0 ? "text-accent" : "text-content-muted"
                    )}
                    aria-hidden
                />
                <span className="font-display text-[26px] leading-none font-bold text-content tabular-nums">
                    {streak.weeks}
                </span>
                <span className="text-body-sm text-content-secondary">
                    {streak.weeks === 1 ? "week" : "weeks"}
                </span>
                <span className="ml-auto font-mono text-label-sm text-content-muted">
                    Best {streak.best} {streak.best === 1 ? "week" : "weeks"}
                </span>
            </div>

            <div className="mt-3 grid grid-cols-2 divide-x divide-subtle">
                <div className="pr-3">
                    <div
                        className="flex gap-1"
                        role="img"
                        aria-label={`${streak.history.filter((w) => w.state !== "empty").length} of the last ${streak.history.length} weeks kept`}
                    >
                        {months.map((m, i) => (
                            <div
                                key={`${m.label}${i}`}
                                className="flex min-w-0 flex-1 flex-col gap-[3px]"
                            >
                                <span className="mb-0.5 h-2.5 truncate text-center text-[9px] leading-none text-content-muted">
                                    {/* A month cut short at the start has no
                                        room for its name. */}
                                    {m.weeks.length >= 3 ? m.label : ""}
                                </span>
                                {m.weeks.map((w) => (
                                    <WeekCell
                                        key={w.week}
                                        state={w.state}
                                        now={w.week === current}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                    <ul className="mt-2.5 flex flex-col gap-1 text-[11px] text-content-muted">
                        <li className="flex items-center gap-1.5">
                            <WeekCell state="active" swatch />
                            Played
                        </li>
                        <li className="flex items-center gap-1.5">
                            <WeekCell state="shield" swatch />
                            Shielded
                        </li>
                        <li className="flex items-center gap-1.5">
                            <WeekCell state="empty" swatch />
                            Missed
                        </li>
                    </ul>
                </div>

                <div
                    className="flex flex-col items-center justify-center gap-2 pl-3 text-center"
                    title="A shield covers a missed week, so your streak carries on. One free a month."
                >
                    <span
                        className={cn(
                            "grid size-14 place-items-center rounded-md",
                            streak.freeShield
                                ? "bg-brand-subtle text-brand"
                                : "bg-surface-sunken text-content-muted"
                        )}
                    >
                        <ShieldCheck size={30} aria-hidden />
                    </span>
                    <span>
                        <span className="block text-label-sm font-semibold text-content">
                            {streak.freeShield ? "Shield ready" : "Shield used"}
                        </span>
                        <span className="block text-[11px] text-content-muted">
                            {streak.freeShield
                                ? "Covers a missed week"
                                : `Back on ${back}`}
                        </span>
                        {streak.spareShields > 0 && (
                            <span className="block text-[11px] text-content-muted">
                                +{streak.spareShields} spare
                            </span>
                        )}
                    </span>
                </div>
            </div>

            {atRisk && (
                <p className="mt-3 text-label-sm font-medium text-love-content">
                    At risk: do anything before Sunday to keep it.
                </p>
            )}
        </AsideCard>
    );
};

const WeekCell = ({
    state,
    now = false,
    swatch = false,
}: {
    state: Progress["streak"]["history"][number]["state"];
    now?: boolean;
    /** The key's small sample, not a week filling its column. */
    swatch?: boolean;
}) => (
    <span
        className={cn(
            "grid h-3.5 place-items-center rounded-[3px]",
            swatch ? "w-4 shrink-0" : "w-full",
            state === "active"
                ? "bg-brand"
                : state === "shield"
                  ? "bg-brand/25 text-brand"
                  : "bg-surface-sunken",
            now && "outline-2 outline-offset-1 outline-content-muted"
        )}
    >
        {state === "shield" && (
            <ShieldCheck size={9} strokeWidth={3} aria-hidden />
        )}
    </span>
);

/* ---------------------------------------------------------- leaderboard */

const BOARD_LABELS: Record<LeaderboardPeriod, string> = {
    week: "XP this week",
    month: "XP this month",
    all: "XP all time",
};

const Leaderboard = () => {
    const [period, setPeriod] = useState<LeaderboardPeriod>("week");
    const { data: rows, isLoading } = useLeaderboard(period);
    const you = rows?.find((r) => r.isYou);
    const top = (rows ?? []).slice(0, 5);
    const shown = you && !top.includes(you) ? [...top, you] : top;

    return (
        <AsideCard title="Friends" bodyClassName="pb-1.5">
            <div className="px-3 pb-2">
                <SegmentedChoice
                    label="Leaderboard period"
                    segments={[
                        { value: "week", label: "Week" },
                        { value: "month", label: "Month" },
                        { value: "all", label: "All time" },
                    ]}
                    value={period}
                    onChange={setPeriod}
                    fill
                />
            </div>
            {isLoading ? (
                <div className="flex flex-col gap-2 px-3 pb-2">
                    {[0, 1, 2].map((i) => (
                        <Skeleton key={i} className="h-10 rounded-md" />
                    ))}
                </div>
            ) : (rows?.length ?? 0) <= 1 ? (
                <div className="flex flex-col items-start gap-2 px-3 pb-2">
                    <p className="text-body-sm text-content-muted">
                        Add friends to see them here.
                    </p>
                </div>
            ) : (
                <>
                    <p className="flex justify-between px-3 pb-1 text-[11px] text-content-muted">
                        <span>Ranked by XP earned</span>
                        <span>{BOARD_LABELS[period]}</span>
                    </p>
                    <ol>
                        {shown.map((r) => (
                            <li key={r.username}>
                                <Link
                                    to={profilePath(r.username)}
                                    className={cn(
                                        "flex min-h-11 items-center gap-2.5 px-3 py-1.5 hover:bg-surface-hover",
                                        r.isYou && "bg-brand-subtle"
                                    )}
                                >
                                    <span
                                        className={cn(
                                            "w-4 text-center font-mono text-label-sm font-bold",
                                            r.rank === 1
                                                ? "text-medal-gold"
                                                : r.rank === 2
                                                  ? "text-medal-silver"
                                                  : r.rank === 3
                                                    ? "text-medal-bronze"
                                                    : "text-content-muted"
                                        )}
                                    >
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
                                    <span className="min-w-0 flex-1 truncate text-body-sm text-content">
                                        {r.isYou ? (
                                            "You"
                                        ) : (
                                            <NameText
                                                font={r.nameFont}
                                                colour={r.nameColour}
                                            >
                                                {r.username}
                                            </NameText>
                                        )}
                                        <span className="ml-1.5 font-mono text-label-sm text-content-muted">
                                            Lv {r.level}
                                        </span>
                                    </span>
                                    <span className="font-mono text-label font-semibold text-content tabular-nums">
                                        {formatCount(r.xp)}
                                        <span className="ml-0.5 text-label-sm font-normal text-content-muted">
                                            XP
                                        </span>
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ol>
                </>
            )}
        </AsideCard>
    );
};

/* ---------------------------------------------------------------- look */

/** One choice in Your look: a picture, a name, and either wearing it, a
 *  price, or what it takes. */
const LookTile = ({
    label,
    on,
    lock,
    price,
    onClick,
    disabled,
    children,
}: {
    label: string;
    on: boolean;
    lock?: string;
    price?: number;
    onClick: () => void;
    disabled?: boolean;
    children: ReactNode;
}) => (
    <button
        type="button"
        aria-pressed={on}
        disabled={disabled}
        onClick={onClick}
        className={cn(
            "flex w-full cursor-pointer flex-col items-center gap-1.5 rounded-md p-2 lift disabled:cursor-not-allowed",
            "focus-visible:outline-2 focus-visible:outline-brand",
            on ? "bg-brand-subtle ring-2 ring-brand" : "hover:bg-surface-hover"
        )}
    >
        <span
            className={cn(
                "grid w-full place-items-center",
                lock && "opacity-40 grayscale"
            )}
        >
            {children}
        </span>
        <span className="line-clamp-1 text-[11px] text-content-secondary">
            {label}
        </span>
        {lock ? (
            <span className="inline-flex items-center gap-0.5 text-[10px] whitespace-nowrap text-content-muted">
                <Lock size={9} aria-hidden />
                {lock}
            </span>
        ) : price !== undefined ? (
            <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-content">
                <TokenCoin className="size-3" />
                {formatCount(price)}
            </span>
        ) : on ? (
            <span className="text-[10px] font-medium text-brand">Active</span>
        ) : (
            // Keeps the row of tiles level whatever each says.
            <span aria-hidden className="h-[15px]" />
        )}
    </button>
);

const LookSection = ({
    id,
    title,
    note,
    children,
}: {
    /** For a gift's notification to link straight here. */
    id?: string;
    title: string;
    note?: string;
    children: ReactNode;
}) => (
    <section id={id} className="scroll-mt-24">
        <h3 className="text-label font-semibold text-content">{title}</h3>
        {note && <p className="text-label-sm text-content-muted">{note}</p>}
        <div className="mt-2">{children}</div>
    </section>
);

const Look = ({ data }: { data: Progress }) => {
    const notify = useNotify();
    const { user } = useAuth();
    const { data: shop } = useShop();
    const { data: lists } = useUserLists(user?.username ?? "", {
        sort: "new",
        page: 1,
        limit: 50,
        enabled: !!user,
    });
    // Only what everyone can see: a hidden list pinned is an empty card to
    // anyone else.
    const pinnable = (lists?.data ?? []).filter(
        (l) => l.visibility === "everyone"
    );
    const setStyle = useSetStyle();
    const [open, setOpen] = useState<ShopEntry | null>(null);
    if (!user) return null;

    const entry = (item: string) => shop?.items.find((i) => i.item === item);
    const failed = (error: unknown) =>
        notify(
            error instanceof ApiError ? error.message : "Couldn't change that",
            "error"
        );
    /** Wear it if it's yours; open it in the shop's popup if it's for sale. */
    const choose = (
        item: string | undefined,
        unlocked: boolean,
        put: () => void
    ) => {
        if (unlocked) return put();
        const e = item ? entry(item) : undefined;
        if (e) setOpen(e);
    };
    const { look } = data;

    const avatar = (
        <ProfilePicture
            variant="friendRow"
            file={user.avatarUrl ?? ""}
            username={user.username}
            accent={user.accent}
            link={false}
        />
    );

    return (
        <Panel
            title="Your look"
            trailing={
                <Link
                    to="/shop"
                    className="relative text-label font-medium text-brand before:absolute before:-inset-x-2 before:-inset-y-3.5 before:content-[''] hover:underline"
                >
                    Shop
                </Link>
            }
            bodyClassName="flex flex-col gap-5 p-4"
        >
            <LookSection id="frame" title="Frame">
                <ul className="grid grid-cols-4 gap-1 sm:grid-cols-7">
                    <li>
                        <LookTile
                            label="None"
                            on={look.frameChoice === NO_FRAME}
                            disabled={setStyle.isPending}
                            onClick={() =>
                                setStyle.mutate(
                                    { frame: NO_FRAME },
                                    { onError: failed }
                                )
                            }
                        >
                            {avatar}
                        </LookTile>
                    </li>
                    {FRAMES.map((f) => {
                        const unlocked = look.frames.includes(
                            f.key as FrameKey
                        );
                        return (
                            <li key={f.key}>
                                <LookTile
                                    label={f.label}
                                    on={
                                        look.frameChoice !== NO_FRAME &&
                                        data.frame === f.key
                                    }
                                    lock={
                                        "level" in f && !unlocked
                                            ? `Level ${f.level}`
                                            : undefined
                                    }
                                    price={
                                        "item" in f && !unlocked
                                            ? entry(f.item)?.price
                                            : undefined
                                    }
                                    disabled={
                                        ("level" in f && !unlocked) ||
                                        setStyle.isPending
                                    }
                                    onClick={() =>
                                        choose(
                                            "item" in f ? f.item : undefined,
                                            unlocked,
                                            () =>
                                                setStyle.mutate(
                                                    {
                                                        frame: f.key as FrameKey,
                                                    },
                                                    { onError: failed }
                                                )
                                        )
                                    }
                                >
                                    <AvatarFrame frame={f.key} size="md">
                                        {avatar}
                                    </AvatarFrame>
                                </LookTile>
                            </li>
                        );
                    })}
                </ul>
            </LookSection>

            <LookSection
                id="name"
                title="Username"
                note="How your username shows on your profile and the friends leaderboard."
            >
                <p className="mb-3 truncate rounded-md bg-surface-sunken/60 px-3 py-3 text-center font-display text-title font-semibold text-content">
                    <NameText font={look.nameFont} colour={look.nameColour}>
                        {user.username}
                    </NameText>
                </p>
                <p className="mb-1 text-label-sm text-content-muted">Font</p>
                <ul className="grid grid-cols-4 gap-1 sm:grid-cols-8">
                    {NAME_FONTS.map((f) => {
                        const unlocked = look.fonts.includes(f.key);
                        return (
                            <li key={f.key}>
                                <LookTile
                                    label={f.label}
                                    on={look.nameFont === f.key}
                                    lock={
                                        "level" in f && !unlocked
                                            ? `Level ${f.level}`
                                            : undefined
                                    }
                                    price={
                                        "item" in f && !unlocked
                                            ? entry(f.item)?.price
                                            : undefined
                                    }
                                    disabled={
                                        ("level" in f && !unlocked) ||
                                        setStyle.isPending
                                    }
                                    onClick={() =>
                                        choose(
                                            "item" in f ? f.item : undefined,
                                            unlocked,
                                            () =>
                                                setStyle.mutate(
                                                    {
                                                        nameFont:
                                                            f.key as NameFontKey,
                                                    },
                                                    { onError: failed }
                                                )
                                        )
                                    }
                                >
                                    <span className="grid h-9 place-items-center text-[20px] text-content">
                                        <NameText font={f.key}>Aa</NameText>
                                    </span>
                                </LookTile>
                            </li>
                        );
                    })}
                </ul>
                <p className="mt-3 mb-1 text-label-sm text-content-muted">
                    Colour
                </p>
                <ul className="grid grid-cols-5 gap-1 sm:grid-cols-9">
                    {NAME_COLOURS.map((c) => {
                        const unlocked = look.colours.includes(c.key);
                        return (
                            <li key={c.key}>
                                <LookTile
                                    label={c.label}
                                    on={look.nameColour === c.key}
                                    lock={
                                        "level" in c && !unlocked
                                            ? `Level ${c.level}`
                                            : undefined
                                    }
                                    price={
                                        "item" in c && !unlocked
                                            ? entry(c.item)?.price
                                            : undefined
                                    }
                                    disabled={
                                        ("level" in c && !unlocked) ||
                                        setStyle.isPending
                                    }
                                    onClick={() =>
                                        choose(
                                            "item" in c ? c.item : undefined,
                                            unlocked,
                                            () =>
                                                setStyle.mutate(
                                                    {
                                                        nameColour:
                                                            c.key as NameColourKey,
                                                    },
                                                    { onError: failed }
                                                )
                                        )
                                    }
                                >
                                    <span className="grid h-9 place-items-center font-display text-[20px] font-bold text-content">
                                        <NameText colour={c.key}>Aa</NameText>
                                    </span>
                                </LookTile>
                            </li>
                        );
                    })}
                </ul>
            </LookSection>

            <LookSection
                id="theme"
                title="Card theme"
                note="The colours of the pictures you share: your invites, your level-ups and your Gaming 25."
            >
                <ul className="grid grid-cols-3 gap-1 sm:grid-cols-6">
                    {CARD_THEMES.map((t) => {
                        const unlocked = look.themes.includes(
                            t.key as CardThemeKey
                        );
                        const levelOnly = "level" in t;
                        return (
                            <li key={t.key}>
                                <LookTile
                                    label={t.label}
                                    on={look.cardTheme === t.key}
                                    lock={
                                        levelOnly && !unlocked
                                            ? `Level ${t.level}`
                                            : undefined
                                    }
                                    price={
                                        "item" in t && !unlocked
                                            ? entry(t.item)?.price
                                            : undefined
                                    }
                                    disabled={
                                        (levelOnly && !unlocked) ||
                                        setStyle.isPending
                                    }
                                    onClick={() =>
                                        choose(
                                            "item" in t ? t.item : undefined,
                                            unlocked,
                                            () =>
                                                setStyle.mutate(
                                                    {
                                                        cardTheme:
                                                            t.key as CardThemeKey,
                                                    },
                                                    { onError: failed }
                                                )
                                        )
                                    }
                                >
                                    <PlayerCardMock
                                        theme={t.key as CardThemeKey}
                                        username={user.username}
                                        avatarUrl={user.avatarUrl}
                                        level={data.level.level}
                                        size="thumb"
                                        className="w-14"
                                    />
                                </LookTile>
                            </li>
                        );
                    })}
                </ul>
            </LookSection>

            <LookSection
                id="reaction"
                title="Reactions"
                note="What you can leave on reviews, lists and posts."
            >
                <ul className="grid grid-cols-5 gap-1 sm:grid-cols-8">
                    {REACTIONS.map((r) => {
                        const unlocked = look.reactions.includes(r.key);
                        return (
                            <li key={r.key}>
                                <LookTile
                                    label={r.label}
                                    on={false}
                                    lock={
                                        "level" in r && !unlocked
                                            ? `Level ${r.level}`
                                            : undefined
                                    }
                                    price={
                                        "item" in r && !unlocked
                                            ? entry(r.item)?.price
                                            : undefined
                                    }
                                    disabled={unlocked || "level" in r}
                                    onClick={() =>
                                        choose(
                                            "item" in r ? r.item : undefined,
                                            false,
                                            () => {}
                                        )
                                    }
                                >
                                    <span className="grid h-9 place-items-center">
                                        <ReactionIcon
                                            reaction={r.key}
                                            size={26}
                                        />
                                    </span>
                                </LookTile>
                            </li>
                        );
                    })}
                </ul>
            </LookSection>

            {pinnable.length > 0 && (
                <LookSection
                    id="pinned-lists"
                    title="Pinned lists"
                    note={`Up to ${look.pinnedListSlots} on your profile.`}
                >
                    <PinToggles
                        field="pinnedLists"
                        items={pinnable.map((l) => ({
                            id: l.id,
                            name: l.name,
                        }))}
                    />
                </LookSection>
            )}

            {open && (
                <ItemSheet
                    item={shop?.items.find((i) => i.item === open.item) ?? open}
                    onClose={() => setOpen(null)}
                />
            )}
        </Panel>
    );
};

/** Pins on your profile, as toggles: lists or reviews, up to the slots
 *  you have, and with none free, the slot to buy here. */
const PinToggles = ({
    field,
    items,
}: {
    field: "pinnedLists" | "pinnedReviews";
    items: { id: number; name: string }[];
}) => {
    const pins = usePins(field);
    return (
        <>
            <ul className="flex flex-wrap gap-2">
                {items.map((l) => {
                    const on = pins.pinned.includes(l.id);
                    return (
                        <li key={l.id}>
                            <button
                                type="button"
                                aria-pressed={on}
                                onClick={() => pins.toggle(l.id)}
                                className={cn(
                                    "inline-flex min-h-11 max-w-60 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-label lift sm:min-h-9",
                                    on
                                        ? "border-brand bg-brand-subtle text-brand"
                                        : "border-subtle hover:border-strong"
                                )}
                            >
                                {on && <Check size={12} aria-hidden />}
                                <span className="truncate">{l.name}</span>
                            </button>
                        </li>
                    );
                })}
            </ul>
            {pins.buying && <ItemSheetFor {...pins.buying} />}
        </>
    );
};

export default ProgressPage;
