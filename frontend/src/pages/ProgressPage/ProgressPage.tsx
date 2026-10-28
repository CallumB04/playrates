import { useState, type ReactNode } from "react";
import { Link, Navigate } from "react-router-dom";
import {
    Check,
    Flame,
    Lock,
    RefreshCw,
    ShieldCheck,
    ShoppingBag,
} from "lucide-react";
import {
    CARD_THEMES,
    EFFECTS,
    FRAMES,
    SHOWCASE_LAYOUTS,
    badgeDef,
    type Metal,
    type CardThemeKey,
    type EffectKey,
    type FrameKey,
    type LeaderboardPeriod,
    type Progress,
    type QuestState,
    type ShopEntry,
    type ShowcaseLayout,
} from "@playrates/shared";
import { ApiError } from "../../api";
import Panel from "../../components/ui/Panel";
import AsideCard from "../../components/ui/AsideCard";
import { buttonClass } from "../../components/ui/Button";
import SegmentedChoice from "../../components/ui/SegmentedChoice";
import { Skeleton } from "../../components/ui/Skeleton";
import ProfilePicture from "../../components/ProfilePicture";
import AvatarFrame from "../../components/progress/AvatarFrame";
import PlayerCardMock from "../../components/progress/PlayerCardMock";
import ShowcaseView, {
    bestOf,
    type ShownBadge,
} from "../../components/progress/ShowcaseView";
import { TokenCoin } from "../../components/progress/TokenAmount";
import XpBar from "../../components/progress/XpBar";
import XpInfo from "../../components/progress/XpInfo";
import { InviteButton, InviteCard } from "../../components/progress/Invite";
import ItemSheet, { useWear } from "../../components/shop/ItemSheet";
import { useAuth } from "../../contexts/AuthContext";
import { useNotify } from "../../contexts/NotificationContext";
import {
    useLeaderboard,
    usePlayerBadges,
    useProgress,
    useReroll,
    useSetStyle,
    useShop,
} from "../../hooks/queries/useProgress";
import { useUserLists } from "../../hooks/queries/useLists";
import { usePageMeta } from "../../hooks/usePageMeta";
import { formatCount } from "../../lib/format";
import { profilePath } from "../../lib/profilePaths";
import { cn } from "../../lib/cn";

const daysLeft = (end: string) =>
    Math.max(1, Math.ceil((Date.parse(end) - Date.now()) / 86_400_000));

/** The next thing a level gives: a frame or a card theme. */
const nextReward = (level: number) =>
    [
        ...FRAMES.flatMap((f) =>
            "level" in f ? [{ level: f.level, label: `${f.label} frame` }] : []
        ),
        ...CARD_THEMES.flatMap((t) =>
            "level" in t
                ? [{ level: t.level, label: `${t.label} card theme` }]
                : []
        ),
    ]
        .filter((r) => r.level > level)
        .sort((a, b) => a.level - b.level)[0];

/** Your progress in one place: level, tasks, streak, friends, and how you
 *  look. */
const ProgressPage = () => {
    const { user, isLoading: authLoading } = useAuth();
    const { data } = useProgress();
    usePageMeta({ title: "Your progress", noindex: true });

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
            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6">
                <div className="flex min-w-0 flex-col gap-4 lg:gap-6">
                    <Tasks data={data} />
                    <Look data={data} />
                </div>
                <aside className="flex min-w-0 flex-col gap-4 lg:gap-6">
                    <Streak data={data} />
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
    const { data: board } = useLeaderboard("week");
    if (!user) return null;
    const reward = nextReward(data.level.level);
    const tasks = [...data.quests.week, ...data.quests.month];
    const rank =
        (board?.length ?? 0) > 1
            ? board!.find((r) => r.isYou)?.rank
            : undefined;

    return (
        // No card: a page's own header sits on the page.
        <header className="flex flex-col gap-5">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
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
                        <h1 className="flex items-baseline gap-2 font-display leading-none font-bold text-content">
                            <span className="text-[22px] text-content-secondary sm:text-[28px]">
                                Level
                            </span>
                            <span className="text-[44px] tracking-tight sm:text-[64px]">
                                {data.level.level}
                            </span>
                        </h1>
                        <div className="mt-2 flex max-w-xl items-start gap-2">
                            <XpBar level={data.level} className="flex-1" />
                            <XpInfo />
                        </div>
                        {reward && (
                            <p className="mt-1 text-label-sm text-content-muted">
                                Level {reward.level} unlocks the {reward.label}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:justify-center">
                    <span
                        className="inline-flex items-center gap-2 font-mono text-[26px] leading-none font-bold text-content tabular-nums sm:text-[30px]"
                        aria-label={`${formatCount(data.tokens)} tokens`}
                    >
                        <TokenCoin className="size-6 text-[11px]" />
                        <span aria-hidden>{formatCount(data.tokens)}</span>
                    </span>
                    <Link
                        to="/shop"
                        className={buttonClass("primary", "sm:w-full", "touch")}
                    >
                        <ShoppingBag size={16} aria-hidden />
                        Shop
                    </Link>
                </div>
            </div>

            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-subtle bg-subtle sm:grid-cols-4">
                <Stat label="Week streak" value={data.streak.weeks} />
                <Stat
                    label="Badges"
                    value={
                        badges
                            ? new Set(badges.held.map((h) => h.badge)).size
                            : "…"
                    }
                    to={profilePath(user.username, "badges")}
                />
                <Stat
                    label="Tasks done"
                    value={`${tasks.filter((t) => t.done).length}/${tasks.length}`}
                />
                <Stat
                    label="Among friends this week"
                    value={rank ? `#${rank}` : "–"}
                />
            </dl>
        </header>
    );
};

const Stat = ({
    label,
    value,
    to,
}: {
    label: string;
    value: ReactNode;
    to?: string;
}) => {
    const body = (
        <>
            <dt className="text-label-sm text-content-muted">{label}</dt>
            <dd className="order-first font-display text-[22px] leading-tight font-bold text-content tabular-nums">
                {value}
            </dd>
        </>
    );
    const className = "flex flex-col bg-surface px-4 py-2.5";
    return to ? (
        <Link to={to} className={cn(className, "hover:bg-surface-hover")}>
            {body}
        </Link>
    ) : (
        <div className={className}>{body}</div>
    );
};

/* --------------------------------------------------------------- tasks */

const Tasks = ({ data }: { data: Progress }) => (
    <Panel title="Tasks" bodyClassName="flex flex-col gap-4 p-4">
        <TaskGroup
            title="This week"
            period="week"
            tasks={data.quests.week}
            days={daysLeft(data.periods.week.end)}
            bonus={5}
            data={data}
        />
        <TaskGroup
            title="This month"
            period="month"
            tasks={data.quests.month}
            days={daysLeft(data.periods.month.end)}
            bonus={15}
            data={data}
        />
    </Panel>
);

const TaskGroup = ({
    title,
    period,
    tasks,
    days,
    bonus,
    data,
}: {
    title: string;
    period: "week" | "month";
    tasks: QuestState[];
    days: number;
    bonus: number;
    data: Progress;
}) => {
    const canSwap = !data.swap.used[period];
    return (
        <section>
            <h3 className="flex flex-wrap items-baseline justify-between gap-x-3 text-label">
                <span className="font-semibold text-content">{title}</span>
                <span className="inline-flex items-center gap-1 font-mono text-label-sm text-content-muted">
                    All 3: +{bonus}
                    <TokenCoin className="size-3 text-[6px]" />
                    <span className="ml-2">
                        {days} {days === 1 ? "day" : "days"} left
                    </span>
                </span>
            </h3>
            <ul className="mt-1.5 divide-y divide-subtle">
                {tasks.map((q) => (
                    <TaskRow
                        key={q.key}
                        task={q}
                        period={period}
                        swap={canSwap && !q.done ? data.swap : null}
                    />
                ))}
            </ul>
        </section>
    );
};

const TaskRow = ({
    task: q,
    period,
    swap,
}: {
    task: QuestState;
    period: "week" | "month";
    swap: Progress["swap"] | null;
}) => (
    <li className="flex min-h-12 items-center gap-3 py-1.5">
        <span
            className={cn(
                "grid size-5 shrink-0 place-items-center rounded-full",
                q.done ? "bg-action text-action-ink" : "ring-1 ring-strong"
            )}
        >
            {q.done && <Check size={12} strokeWidth={3} aria-hidden />}
        </span>
        <span className="min-w-0 flex-1">
            <span
                className={cn(
                    "block text-body-sm text-content sm:truncate",
                    q.done && "text-content-muted line-through"
                )}
            >
                {q.label}
            </span>
            {!q.done && q.target > 1 && (
                <span className="mt-1 flex items-center gap-2">
                    <span className="h-1 w-24 overflow-hidden rounded-full bg-surface-sunken">
                        <span
                            className="block h-full rounded-full bg-brand"
                            style={{ width: `${(q.count / q.target) * 100}%` }}
                        />
                    </span>
                    <span className="font-mono text-[11px] text-content-muted tabular-nums">
                        {q.count}/{q.target}
                    </span>
                </span>
            )}
        </span>
        <span
            className={cn(
                "shrink-0 font-mono text-label font-semibold tabular-nums",
                q.done ? "text-content-muted" : "text-brand"
            )}
        >
            +{q.xp} XP
        </span>
        {swap && <SwapButton task={q} period={period} swap={swap} />}
    </li>
);

/** Swaps a task for another: a tap to ask, a second to spend. */
const SwapButton = ({
    task,
    period,
    swap,
}: {
    task: QuestState;
    period: "week" | "month";
    swap: Progress["swap"];
}) => {
    const notify = useNotify();
    const reroll = useReroll();
    const [asking, setAsking] = useState(false);
    const free = swap.held > 0;
    return (
        <button
            type="button"
            disabled={reroll.isPending}
            onBlur={() => setAsking(false)}
            onClick={() => {
                if (!asking) return setAsking(true);
                reroll.mutate(
                    { period, slot: task.slot },
                    {
                        onSettled: () => setAsking(false),
                        onError: (error) =>
                            notify(
                                error instanceof ApiError
                                    ? error.message
                                    : "Couldn't swap that task",
                                "error"
                            ),
                    }
                );
            }}
            aria-label={
                asking
                    ? `Confirm swapping ${task.label}`
                    : `Swap ${task.label} for another task${free ? "" : `, ${swap.price} tokens`}`
            }
            className={cn(
                "relative inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-full px-2 font-mono text-label-sm tabular-nums before:absolute before:-inset-2 before:content-[''] disabled:opacity-50",
                "focus-visible:outline-2 focus-visible:outline-brand",
                asking
                    ? "bg-brand text-content-on-solid"
                    : "text-content-muted hover:bg-surface-hover hover:text-content"
            )}
        >
            <RefreshCw size={12} aria-hidden />
            {asking ? (
                "Swap?"
            ) : free ? (
                "Free"
            ) : (
                <>
                    <TokenCoin className="size-3 text-[6px]" />
                    {swap.price}
                </>
            )}
        </button>
    );
};

/* -------------------------------------------------------------- streak */

const MONTH = new Intl.DateTimeFormat(undefined, { month: "short" });

const Streak = ({ data }: { data: Progress }) => {
    const { streak } = data;
    // From Friday, a week still empty says so.
    const atRisk =
        !streak.thisWeek && streak.weeks > 0 && new Date().getDay() >= 5;
    // Columns by month, as a contribution graph has them by week.
    const months: { label: string; weeks: typeof streak.history }[] = [];
    for (const w of streak.history) {
        const label = MONTH.format(new Date(`${w.week}T12:00:00`));
        const last = months.at(-1);
        if (last?.label === label) last.weeks.push(w);
        else months.push({ label, weeks: [w] });
    }
    const current = streak.history.at(-1)?.week;

    return (
        <AsideCard
            title="Streak"
            trailing={
                <span
                    className={cn(
                        "inline-flex items-center gap-1 text-label-sm",
                        streak.freeShield
                            ? "text-content-secondary"
                            : "text-content-muted"
                    )}
                    title="One free shield a month covers a missed week"
                >
                    <ShieldCheck size={13} aria-hidden />
                    {streak.freeShield ? "Shield ready" : "Shield used"}
                    {streak.spareShields > 0 && ` +${streak.spareShields}`}
                </span>
            }
        >
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
                    Best {streak.best}
                </span>
            </div>

            <div
                className="mt-3 flex justify-between gap-1"
                role="img"
                aria-label={`${streak.history.filter((w) => w.state !== "empty").length} of the last ${streak.history.length} weeks kept`}
            >
                {months.map((m, i) => (
                    <div
                        key={`${m.label}${i}`}
                        className="flex flex-col items-center gap-1"
                    >
                        <span className="text-[10px] text-content-muted">
                            {m.label}
                        </span>
                        {m.weeks.map((w) => (
                            <span
                                key={w.week}
                                className={cn(
                                    "size-4 rounded-[3px]",
                                    w.state === "active"
                                        ? "bg-brand"
                                        : w.state === "shield"
                                          ? "bg-brand/30 ring-1 ring-brand/60 ring-inset"
                                          : "bg-surface-sunken",
                                    w.week === current &&
                                        "outline-2 outline-offset-1 outline-content-muted"
                                )}
                            />
                        ))}
                    </div>
                ))}
            </div>

            <p
                className={cn(
                    "mt-3 text-label-sm",
                    atRisk
                        ? "font-medium text-love-content"
                        : "text-content-muted"
                )}
            >
                {streak.thisWeek
                    ? "This week counts. See you next week."
                    : atRisk
                      ? "At risk: do anything before Sunday to keep it."
                      : "Log, rate or review anything this week to keep it going."}
            </p>
        </AsideCard>
    );
};

/* ---------------------------------------------------------- leaderboard */

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
                        Add friends to see how you stack up.
                    </p>
                    <InviteButton />
                </div>
            ) : (
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
                                    {r.isYou ? "You" : r.username}
                                    <span className="ml-1.5 font-mono text-label-sm text-content-muted">
                                        Lv {r.level}
                                    </span>
                                </span>
                                <span className="font-mono text-label font-semibold text-content tabular-nums">
                                    {formatCount(r.xp)}
                                </span>
                            </Link>
                        </li>
                    ))}
                </ol>
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
            <span className="inline-flex items-center gap-0.5 text-[10px] text-content-muted">
                <Lock size={9} aria-hidden />
                {lock}
            </span>
        ) : price !== undefined ? (
            <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-content">
                <TokenCoin className="size-3 text-[6px]" />
                {formatCount(price)}
            </span>
        ) : on ? (
            <span className="text-[10px] font-medium text-brand">Wearing</span>
        ) : null}
    </button>
);

const LookSection = ({
    title,
    note,
    children,
}: {
    title: string;
    note?: string;
    children: ReactNode;
}) => (
    <section>
        <h3 className="text-label font-semibold text-content">{title}</h3>
        {note && <p className="text-label-sm text-content-muted">{note}</p>}
        <div className="mt-2">{children}</div>
    </section>
);

const LAYOUT_LABELS: Record<ShowcaseLayout, string> = {
    row: "Row",
    layout_shelf: "Shelf",
    layout_spotlight: "Spotlight",
};

const Look = ({ data }: { data: Progress }) => {
    const notify = useNotify();
    const { user } = useAuth();
    const { data: shop } = useShop();
    const { data: badges } = usePlayerBadges(user?.username ?? "", !!user);
    const { data: lists } = useUserLists(user?.username ?? "", {
        sort: "new",
        page: 1,
        limit: 50,
        enabled: !!user,
    });
    const setStyle = useSetStyle();
    const { wearing } = useWear();
    const [open, setOpen] = useState<ShopEntry | null>(null);
    if (!user) return null;

    const entry = (item: string) => shop?.items.find((i) => i.item === item);
    const owns = (item: string) => (entry(item)?.owned ?? 0) > 0;
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

    // Pinned first, then the best of the rest, to fill a layout's preview.
    const best = badges ? bestOf(badges) : new Map<string, { metal: Metal }>();
    const sample: ShownBadge[] = [
        ...(badges?.showcase ?? []),
        ...[...best.keys()].filter((k) => !badges?.showcase.includes(k)),
    ]
        .slice(0, 3)
        .flatMap((key) => {
            const def = badgeDef(key);
            const held = best.get(key);
            return def && held ? [{ def, metal: held.metal }] : [];
        });

    return (
        <Panel
            title="Your look"
            trailing={
                <Link
                    to="/shop"
                    className="text-label font-medium text-brand hover:underline"
                >
                    Shop
                </Link>
            }
            bodyClassName="flex flex-col gap-5 p-4"
        >
            <LookSection title="Frame">
                <ul className="grid grid-cols-4 gap-1 sm:grid-cols-6">
                    {FRAMES.map((f) => {
                        const unlocked = data.look.frames.includes(
                            f.key as FrameKey
                        );
                        const forSale = "item" in f && !unlocked;
                        return (
                            <li key={f.key}>
                                <LookTile
                                    label={f.label}
                                    on={data.frame === f.key}
                                    lock={
                                        "level" in f && !unlocked
                                            ? `Level ${f.level}`
                                            : undefined
                                    }
                                    price={
                                        forSale
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
                                        <ProfilePicture
                                            variant="friendRow"
                                            file={user.avatarUrl ?? ""}
                                            username={user.username}
                                            accent={user.accent}
                                            link={false}
                                        />
                                    </AvatarFrame>
                                </LookTile>
                            </li>
                        );
                    })}
                </ul>
            </LookSection>

            <LookSection
                title="Card theme"
                note="The colours of the pictures you share: your Player card and your Gaming 25."
            >
                <ul className="grid grid-cols-3 gap-1 sm:grid-cols-6">
                    {CARD_THEMES.map((t) => {
                        const unlocked = data.look.themes.includes(
                            t.key as CardThemeKey
                        );
                        const levelOnly = "level" in t;
                        return (
                            <li key={t.key}>
                                <LookTile
                                    label={t.label}
                                    on={data.look.cardTheme === t.key}
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
                title="Showcase"
                note="How the badges you pin sit on your profile."
            >
                <ul className="grid grid-cols-3 gap-1">
                    {SHOWCASE_LAYOUTS.map((l) => {
                        const unlocked = l === "row" || owns(l);
                        return (
                            <li key={l}>
                                <LookTile
                                    label={LAYOUT_LABELS[l]}
                                    on={data.look.layout === l}
                                    price={
                                        unlocked ? undefined : entry(l)?.price
                                    }
                                    disabled={setStyle.isPending}
                                    onClick={() =>
                                        choose(
                                            l === "row" ? undefined : l,
                                            unlocked,
                                            () =>
                                                setStyle.mutate(
                                                    { layout: l },
                                                    { onError: failed }
                                                )
                                        )
                                    }
                                >
                                    <span className="grid h-14 place-items-center">
                                        <ShowcaseView
                                            layout={l}
                                            badges={sample}
                                        />
                                    </span>
                                </LookTile>
                            </li>
                        );
                    })}
                </ul>
            </LookSection>

            <LookSection title="Effects">
                <ul className="grid grid-cols-2 gap-1 sm:grid-cols-4">
                    {EFFECTS.map((e) => {
                        const unlocked = owns(e);
                        const on = !!wearing(e);
                        return (
                            <li key={e}>
                                <LookTile
                                    label={entry(e)?.label ?? e}
                                    on={on}
                                    price={
                                        unlocked ? undefined : entry(e)?.price
                                    }
                                    disabled={setStyle.isPending}
                                    onClick={() =>
                                        choose(e, unlocked, () =>
                                            setStyle.mutate(
                                                {
                                                    effects: on
                                                        ? (
                                                              user.effects as EffectKey[]
                                                          ).filter(
                                                              (x) => x !== e
                                                          )
                                                        : [
                                                              ...(user.effects as EffectKey[]),
                                                              e,
                                                          ],
                                                },
                                                { onError: failed }
                                            )
                                        )
                                    }
                                >
                                    <span
                                        className={cn(
                                            "grid h-10 w-full place-items-center truncate font-display text-body font-semibold text-content",
                                            e === "effect_glow" &&
                                                "pr-name-glow"
                                        )}
                                    >
                                        {e === "effect_glow" ? (
                                            user.username
                                        ) : (
                                            <span
                                                aria-hidden
                                                className="block h-8 w-full rounded-sm"
                                                style={{
                                                    backgroundImage:
                                                        "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.5) 50%, transparent 60%), linear-gradient(135deg, var(--color-brand-deep), var(--color-accent))",
                                                }}
                                            />
                                        )}
                                    </span>
                                </LookTile>
                            </li>
                        );
                    })}
                </ul>
            </LookSection>

            {(lists?.data.length ?? 0) > 0 && (
                <LookSection
                    title="Pinned lists"
                    note={`Up to ${data.look.pinnedListSlots} on your profile.`}
                >
                    <PinnedLists
                        lists={lists!.data.map((l) => ({
                            id: l.id,
                            name: l.name,
                        }))}
                        slots={data.look.pinnedListSlots}
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

const PinnedLists = ({
    lists,
    slots,
}: {
    lists: { id: number; name: string }[];
    slots: number;
}) => {
    const { user } = useAuth();
    const notify = useNotify();
    const setStyle = useSetStyle();
    const [pinned, setPinned] = useState<number[]>(user?.pinnedLists ?? []);
    const toggle = (id: number) => {
        const next = pinned.includes(id)
            ? pinned.filter((p) => p !== id)
            : [...pinned, id];
        if (next.length > slots) {
            notify(
                `You can pin ${slots} for now. More slots are in the shop.`,
                "info"
            );
            return;
        }
        setPinned(next);
        setStyle.mutate({ pinnedLists: next });
    };
    return (
        <ul className="flex flex-wrap gap-2">
            {lists.map((l) => {
                const on = pinned.includes(l.id);
                return (
                    <li key={l.id}>
                        <button
                            type="button"
                            aria-pressed={on}
                            onClick={() => toggle(l.id)}
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
    );
};

export default ProgressPage;
