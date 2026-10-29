import type { ReactNode } from "react";
import {
    ArrowRight,
    ListOrdered,
    MessageSquareQuote,
    Plus,
    ShieldCheck,
} from "lucide-react";
import {
    BADGES,
    BASE_PINNED_LISTS,
    BASE_PINNED_REVIEWS,
    BASE_SHOWCASE_SLOTS,
    type BadgeDef,
    type Metal,
    type ShopEntry,
} from "@playrates/shared";
import ProfilePicture from "../ProfilePicture";
import AvatarFrame from "../progress/AvatarFrame";
import BadgeMedal from "../progress/BadgeMedal";
import LevelChip from "../progress/LevelChip";
import NameText from "../progress/NameText";
import PlayerCardMock from "../progress/PlayerCardMock";
import { bestOf, type ShownBadge } from "../progress/ShowcaseView";
import { useAuth } from "../../contexts/AuthContext";
import { usePlayerBadges, useProgress } from "../../hooks/queries/useProgress";
import { cn } from "../../lib/cn";
import ReactionIcon from "../progress/ReactionIcon";
import { REACTION_COLOURS } from "../progress/reactionIcons";
import { itemReactions, lookOf, type ItemLook } from "./shopItems";

/** Your own best badges for the slots to hold, or a stand-in set if you
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
              : look.kind === "review_slot"
                ? (data?.look.pinnedReviewSlots ?? 0)
                : (data?.streak.spareShields ?? item.owned);
    return { now, next: now + 1 };
};

/** What comes free before any are bought. */
const BASE: Record<string, number> = {
    slot_showcase: BASE_SHOWCASE_SLOTS,
    slot_pinned_list: BASE_PINNED_LISTS,
    slot_pinned_review: BASE_PINNED_REVIEWS,
};

/** Where an item that's bought more than once has got to: the free ones,
 *  the bought ones, the next, and what's left, a dot each. */
export const Pips = ({ item }: { item: ShopEntry }) => {
    const base = BASE[item.item] ?? 0;
    const total = base + item.maxOwned;
    const had = base + item.owned;
    return (
        <span
            className="flex items-center gap-1"
            role="img"
            aria-label={`${had} of ${total}`}
        >
            {Array.from({ length: total }, (_, i) => (
                <span
                    key={i}
                    className={cn(
                        "size-2 rounded-full",
                        i < base
                            ? "bg-content-muted/50"
                            : i < had
                              ? "bg-brand"
                              : i === had
                                ? "border border-dashed border-brand"
                                : "border border-strong"
                    )}
                />
            ))}
        </span>
    );
};

/** A reaction as it sits under a review: its icon and a count. */
/** A reaction as it sits under a review: its icon, coloured, and a count;
 *  `lit` for the viewer's own, washed in its colour. */
const ReactionChip = ({
    reaction,
    count,
    lit = false,
}: {
    reaction: string;
    count: number;
    lit?: boolean;
}) => {
    const colour = REACTION_COLOURS[reaction] ?? "var(--brand)";
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-label-sm",
                lit
                    ? "font-semibold text-content"
                    : "border-subtle text-content-muted"
            )}
            style={
                lit
                    ? {
                          borderColor: colour,
                          background: `color-mix(in srgb, ${colour} 14%, transparent)`,
                      }
                    : undefined
            }
        >
            <ReactionIcon reaction={reaction} size={16} />
            <span className="font-mono tabular-nums">{count}</span>
        </span>
    );
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

/** Your name in a font or colour, keeping whichever of the two you wear. */
const NamePreview = ({
    look,
    className,
}: {
    look: ItemLook;
    className?: string;
}) => {
    const { user } = useAuth();
    if (!user) return null;
    return (
        <span
            className={cn(
                "max-w-full truncate px-3 font-display font-semibold text-content",
                className
            )}
        >
            <NameText
                font={look.kind === "font" ? look.font : user.nameFont}
                colour={look.kind === "colour" ? look.colour : user.nameColour}
            >
                {user.username}
            </NameText>
        </span>
    );
};

/** The small picture on a shop tile. `bare` drops a slot's count. */
export const ItemThumb = ({
    item,
    bare = false,
}: {
    item: ShopEntry;
    bare?: boolean;
}) => {
    const { user } = useAuth();
    const { data } = useProgress();
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
        case "font":
        case "colour":
            return <NamePreview look={look} className="text-section" />;
        case "reactions": {
            const reactions = itemReactions(look.item);
            return (
                <span className="flex flex-wrap justify-center gap-3 px-3">
                    {reactions.map((r) => (
                        <ReactionIcon
                            key={r.key}
                            reaction={r.key}
                            size={reactions.length === 1 ? 44 : 32}
                        />
                    ))}
                </span>
            );
        }
        case "showcase_slot":
        case "list_slot":
        case "review_slot":
        case "shield": {
            const Icon =
                look.kind === "shield"
                    ? ShieldCheck
                    : look.kind === "list_slot"
                      ? ListOrdered
                      : look.kind === "review_slot"
                        ? MessageSquareQuote
                        : Plus;
            return (
                <span className="flex flex-col items-center gap-2 text-section">
                    <span className="grid size-10 place-items-center rounded-md bg-brand-subtle text-brand">
                        <Icon size={20} aria-hidden />
                    </span>
                    {!bare && <Pips item={item} />}
                    {!bare && item.owned < item.maxOwned && (
                        <Change {...counts} unit={item.label} />
                    )}
                </span>
            );
        }
    }
};

/** The large preview in an item's popup: the item where it will be seen. */
export const ItemStage = ({ item }: { item: ShopEntry }) => {
    const { user } = useAuth();
    const { data } = useProgress();
    const badges = useSampleBadges(8);
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
                        As shared with your invites and level-ups
                    </p>
                </div>
            );
        case "font":
        case "colour":
            return (
                <div className="flex flex-col gap-2">
                    <Context label="On your profile">
                        <AvatarFrame frame={data?.frame} size="sm">
                            {avatar("nav")}
                        </AvatarFrame>
                        <NamePreview look={look} className="px-0 text-title" />
                    </Context>
                    <Context label="On the friends leaderboard">
                        <span className="w-4 text-center font-mono text-label-sm font-bold text-medal-gold">
                            1
                        </span>
                        <NamePreview
                            look={look}
                            className="flex-1 px-0 text-body-sm"
                        />
                    </Context>
                </div>
            );
        case "reactions":
            return (
                <div className="flex flex-col items-center gap-5">
                    <span className="flex gap-5">
                        {itemReactions(look.item).map((r) => (
                            <ReactionIcon
                                key={r.key}
                                reaction={r.key}
                                size={52}
                            />
                        ))}
                    </span>
                    <Context label="Under a review">
                        <ReactionChip reaction="upvote" count={12} />
                        {itemReactions(look.item).map((r, i) => (
                            <ReactionChip
                                key={r.key}
                                reaction={r.key}
                                count={5 - i * 2}
                                lit={i === 0}
                            />
                        ))}
                    </Context>
                </div>
            );
        case "review_slot":
            return (
                <SlotRow
                    {...counts}
                    label="reviews pinned to your profile"
                    vertical
                >
                    {(_, isNew) =>
                        isNew ? (
                            <NewSlot className="h-12 w-full rounded-md" />
                        ) : (
                            <span className="flex h-12 w-full items-center gap-2 rounded-md border border-subtle bg-surface-raised px-3">
                                <MessageSquareQuote
                                    size={14}
                                    className="text-content-muted"
                                    aria-hidden
                                />
                                <span className="flex flex-1 flex-col gap-1">
                                    <span className="h-1.5 w-32 rounded-full bg-surface-sunken" />
                                    <span className="h-1.5 w-20 rounded-full bg-surface-sunken" />
                                </span>
                            </span>
                        )
                    }
                </SlotRow>
            );
        case "showcase_slot":
            return (
                <SlotRow {...counts} label="badges beside your level">
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
                                "grid size-12 place-items-center rounded-md",
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
    children: ReactNode;
}) => (
    <div className="min-w-0 flex-1 rounded-md border border-subtle bg-surface p-3">
        <p className="text-label-sm text-content-muted">{label}</p>
        <div className="mt-2 flex min-w-0 items-center gap-2.5">{children}</div>
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
    children: (index: number, isNew: boolean) => ReactNode;
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
