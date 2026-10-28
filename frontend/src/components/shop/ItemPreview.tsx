import { ArrowRight, ListOrdered, Plus, ShieldCheck } from "lucide-react";
import {
    BADGES,
    type BadgeDef,
    type Metal,
    type ShopEntry,
} from "@playrates/shared";
import ProfilePicture from "../ProfilePicture";
import AvatarFrame from "../progress/AvatarFrame";
import BadgeMedal from "../progress/BadgeMedal";
import LevelChip from "../progress/LevelChip";
import PlayerCardMock from "../progress/PlayerCardMock";
import ShowcaseView, {
    bestOf,
    type ShownBadge,
} from "../progress/ShowcaseView";
import { useAuth } from "../../contexts/AuthContext";
import { usePlayerBadges, useProgress } from "../../hooks/queries/useProgress";
import { cn } from "../../lib/cn";
import { lookOf } from "./shopItems";

/** Your own best badges for a layout to hold, or a stand-in set if you
 *  haven't enough of your own yet. */
const useSampleBadges = (count: number): ShownBadge[] => {
    const { user } = useAuth();
    const { data } = usePlayerBadges(user?.username ?? "", !!user);
    const all = BADGES as readonly BadgeDef[];
    const own = data
        ? [...bestOf(data)]
              .sort((a, b) => b[1].metal - a[1].metal)
              .flatMap(([key, held]) => {
                  const def = all.find((b) => b.key === key);
                  return def ? [{ def, metal: held.metal }] : [];
              })
        : [];
    if (own.length >= 3) return own.slice(0, count);
    return all
        .filter((b) => !b.secret)
        .slice(0, count)
        .map((def, i) => ({ def, metal: (4 - (i % 4)) as Metal }));
};

/** What a slot or helper holds now, and after one more. */
const useCounts = (item: ShopEntry) => {
    const { data } = useProgress();
    const look = lookOf(item.item);
    const now =
        look.kind === "showcase_slot"
            ? (data?.look.showcaseSlots ?? 0)
            : look.kind === "list_slot"
              ? (data?.look.pinnedListSlots ?? 0)
              : (data?.streak.spareShields ?? item.owned);
    return { now, next: now + 1 };
};

const Change = ({
    now,
    next,
    unit,
}: {
    now: number;
    next: number;
    unit: string;
}) => (
    <span className="flex items-center gap-2 font-mono tabular-nums">
        <span className="text-content-muted">{now}</span>
        <ArrowRight size={14} className="text-content-muted" aria-hidden />
        <span className="font-bold text-brand">{next}</span>
        <span className="sr-only">{unit}</span>
    </span>
);

/** The small picture on a shop tile. `bare` drops a slot's count, for
 *  just after buying one, when the count is mid-refresh. */
export const ItemThumb = ({
    item,
    bare = false,
}: {
    item: ShopEntry;
    bare?: boolean;
}) => {
    const { user } = useAuth();
    const { data } = useProgress();
    const badges = useSampleBadges(4);
    const counts = useCounts(item);
    const look = lookOf(item.item);
    if (!user) return null;

    switch (look.kind) {
        case "frame":
            return (
                <AvatarFrame frame={look.frame} size="lg">
                    <ProfilePicture
                        variant="review"
                        file={user.avatarUrl ?? ""}
                        username={user.username}
                        accent={user.accent}
                        link={false}
                    />
                </AvatarFrame>
            );
        case "theme":
            return (
                <PlayerCardMock
                    theme={look.theme}
                    username={user.username}
                    avatarUrl={user.avatarUrl}
                    level={data?.level.level ?? 1}
                    size="thumb"
                    className="w-20 shadow-lifted"
                />
            );
        case "effect":
            return look.effect === "effect_glow" ? (
                <span className="pr-name-glow max-w-full truncate px-3 font-display text-section font-semibold text-content">
                    {user.username}
                </span>
            ) : (
                <BannerMock sheen className="h-16 w-40" />
            );
        case "layout":
            return (
                <ShowcaseView
                    layout={look.layout}
                    badges={badges.slice(0, 4)}
                />
            );
        case "showcase_slot":
        case "list_slot":
        case "shield": {
            const Icon =
                look.kind === "shield"
                    ? ShieldCheck
                    : look.kind === "list_slot"
                      ? ListOrdered
                      : Plus;
            return (
                <span className="flex flex-col items-center gap-2 text-section">
                    <span className="grid size-10 place-items-center rounded-full bg-brand-subtle text-brand">
                        <Icon size={20} aria-hidden />
                    </span>
                    {!bare && <Change {...counts} unit={item.label} />}
                </span>
            );
        }
    }
};

/** A banner as a profile has one, with the sheen crossing it. */
const BannerMock = ({
    sheen,
    loop = false,
    className,
}: {
    sheen: boolean;
    loop?: boolean;
    className?: string;
}) => (
    <span
        aria-hidden
        className={cn(
            "relative block overflow-hidden rounded-md bg-linear-to-br from-brand-deep via-brand/60 to-accent/50",
            className
        )}
    >
        {sheen && (
            <span
                className={cn("absolute inset-0", loop ? "animate-sheen" : "")}
                style={{
                    backgroundImage:
                        "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.55) 50%, transparent 60%)",
                    backgroundSize: "250% 100%",
                    backgroundPosition: loop ? undefined : "50% 0",
                    animationIterationCount: loop ? "infinite" : undefined,
                    animationDuration: loop ? "2.4s" : undefined,
                }}
            />
        )}
    </span>
);

/** The large preview in an item's popup: the item where it will be seen. */
export const ItemStage = ({ item }: { item: ShopEntry }) => {
    const { user } = useAuth();
    const { data } = useProgress();
    const { data: own } = usePlayerBadges(user?.username ?? "", !!user);
    const badges = useSampleBadges(5);
    const counts = useCounts(item);
    const look = lookOf(item.item);
    if (!user) return null;
    const level = data?.level.level ?? 1;

    const avatar = (variant: "profileHeader" | "nav" | "friendRow") => (
        <ProfilePicture
            variant={variant}
            file={user.avatarUrl ?? ""}
            username={user.username}
            accent={user.accent}
            link={false}
        />
    );

    switch (look.kind) {
        case "frame":
            return (
                <div className="flex flex-col items-center gap-5">
                    <AvatarFrame frame={look.frame} size="xl">
                        {avatar("profileHeader")}
                    </AvatarFrame>
                    <div className="flex w-full flex-col gap-2 sm:flex-row">
                        <Context label="In the menu">
                            <span className="relative">
                                <AvatarFrame frame={look.frame} size="sm">
                                    {avatar("nav")}
                                </AvatarFrame>
                                <LevelChip
                                    level={level}
                                    className="absolute -right-1 -bottom-1"
                                />
                            </span>
                        </Context>
                        <Context label="On your reviews">
                            <AvatarFrame frame={look.frame} size="sm">
                                {avatar("friendRow")}
                            </AvatarFrame>
                            <span className="min-w-0">
                                <span className="block truncate text-body-sm font-semibold text-content">
                                    {user.username}
                                </span>
                                <span className="block h-1.5 w-20 rounded-full bg-surface-sunken" />
                            </span>
                        </Context>
                    </div>
                </div>
            );
        case "theme":
            return (
                <div className="flex flex-col items-center gap-3">
                    <PlayerCardMock
                        theme={look.theme}
                        username={user.username}
                        avatarUrl={user.avatarUrl}
                        level={level}
                        className="w-52 shadow-lifted sm:w-60"
                    />
                    <p className="text-label-sm text-content-muted">
                        Your Player card, as you’d share it
                    </p>
                </div>
            );
        case "effect":
            return (
                <div className="relative overflow-hidden rounded-md border border-subtle bg-surface">
                    <BannerMock
                        sheen={look.effect === "effect_sheen"}
                        loop
                        className="h-20 rounded-none"
                    />
                    <div className="-mt-8 flex items-end gap-3 px-4 pb-4">
                        <span className="rounded-full ring-4 ring-surface">
                            <AvatarFrame frame={data?.frame} size="md">
                                {avatar("nav")}
                            </AvatarFrame>
                        </span>
                        <span
                            className={cn(
                                "truncate font-display text-section font-semibold text-content",
                                look.effect === "effect_glow" && "pr-name-glow"
                            )}
                        >
                            {user.username}
                        </span>
                    </div>
                </div>
            );
        case "layout":
            return (
                <div className="flex flex-col items-center rounded-md border border-subtle bg-surface p-5">
                    <ShowcaseView
                        layout={look.layout}
                        badges={badges}
                        size="md"
                    />
                    {(own?.held.length ?? 0) < 3 && (
                        <p className="mt-3 text-center text-label-sm text-content-muted">
                            Shown with sample badges until you have a few of
                            your own
                        </p>
                    )}
                </div>
            );
        case "showcase_slot":
            return (
                <SlotRow {...counts} label="badges in your showcase">
                    {(i, isNew) =>
                        isNew ? (
                            <NewSlot className="size-11 rounded-full" />
                        ) : badges[i] ? (
                            <BadgeMedal
                                badge={badges[i]!.def}
                                metal={badges[i]!.metal}
                                size="md"
                            />
                        ) : (
                            <span className="block size-11 rounded-full border border-dashed border-strong" />
                        )
                    }
                </SlotRow>
            );
        case "list_slot":
            return (
                <SlotRow
                    {...counts}
                    label="lists pinned to your profile"
                    vertical
                >
                    {(_, isNew) =>
                        isNew ? (
                            <NewSlot className="h-10 w-full rounded-md" />
                        ) : (
                            <span className="flex h-10 w-full items-center gap-2 rounded-md border border-subtle bg-surface-raised px-3">
                                <ListOrdered
                                    size={14}
                                    className="text-content-muted"
                                    aria-hidden
                                />
                                <span className="h-1.5 w-28 rounded-full bg-surface-sunken" />
                            </span>
                        )
                    }
                </SlotRow>
            );
        case "shield":
            return (
                <SlotRow {...counts} label="spare streak shields">
                    {(_, isNew) => (
                        <span
                            className={cn(
                                "grid size-12 place-items-center rounded-full",
                                isNew
                                    ? "bg-brand text-content-on-solid shadow-glow"
                                    : "bg-brand-subtle text-brand"
                            )}
                        >
                            <ShieldCheck size={22} aria-hidden />
                        </span>
                    )}
                </SlotRow>
            );
    }
};

const Context = ({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) => (
    <div className="flex-1 rounded-md border border-subtle bg-surface p-3">
        <p className="text-label-sm text-content-muted">{label}</p>
        <div className="mt-2 flex items-center gap-2.5">{children}</div>
    </div>
);

const NewSlot = ({ className }: { className?: string }) => (
    <span
        className={cn(
            "grid place-items-center border-2 border-dashed border-brand bg-brand-subtle text-brand",
            className
        )}
    >
        <Plus size={16} aria-hidden />
    </span>
);

/** The slots held now, and the one this buys, lit. */
const SlotRow = ({
    now,
    next,
    label,
    vertical = false,
    children,
}: {
    now: number;
    next: number;
    label: string;
    vertical?: boolean;
    children: (index: number, isNew: boolean) => React.ReactNode;
}) => (
    <div className="flex flex-col items-center gap-4 rounded-md border border-subtle bg-surface p-4">
        <ul
            className={cn(
                "flex justify-center gap-2",
                vertical ? "w-full max-w-xs flex-col" : "flex-wrap"
            )}
        >
            {Array.from({ length: next }, (_, i) => (
                <li key={i} className={cn(vertical && "w-full")}>
                    {children(i, i === now)}
                </li>
            ))}
        </ul>
        <p className="flex items-center gap-2 text-body-sm text-content-secondary">
            <Change now={now} next={next} unit={label} />
            <span>{label}</span>
        </p>
    </div>
);
