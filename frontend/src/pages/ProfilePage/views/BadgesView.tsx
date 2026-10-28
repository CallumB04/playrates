import { useMemo, useState } from "react";
import { Pin } from "lucide-react";
import {
    BADGE_CATEGORIES,
    BADGES,
    METALS,
    type BadgeCategory,
    type BadgeDef,
    type BadgeKey,
    type Metal,
} from "@playrates/shared";
import { ApiError } from "../../../api";
import { cardClass } from "../../../components/ui/Card";
import { Skeleton } from "../../../components/ui/Skeleton";
import BadgeMedal from "../../../components/progress/BadgeMedal";
import { bestOf } from "../../../components/progress/ShowcaseView";
import { badgeText, nextTier } from "../../../components/progress/badgeText";
import { useNotify } from "../../../contexts/NotificationContext";
import {
    usePlayerBadges,
    useProgress,
    useSetStyle,
} from "../../../hooks/queries/useProgress";
import { formatCount } from "../../../lib/format";
import { cn } from "../../../lib/cn";

const CATEGORY_LABELS: Record<BadgeCategory, string> = {
    collection: "Collection",
    completion: "Completion",
    explorer: "Explorer",
    critic: "Critic",
    community: "Community",
    curation: "Curation",
    social: "Social",
    dedication: "Dedication",
    special: "Special",
};

const ALL = BADGES as readonly BadgeDef[];

/* The medal colours follow the theme; a metallic sweep washes out on a
   light page at this size. */
const METAL_TEXT: Record<Metal, string> = {
    1: "text-medal-bronze",
    2: "text-medal-silver",
    3: "text-medal-gold",
    4: "text-brand",
};

const rarityText = (rarity: number) =>
    rarity >= 0.995
        ? "Everyone has this"
        : `${rarity < 0.01 ? "<1" : Math.round(rarity * 100)}% of members`;

interface BadgesViewProps {
    username: string;
    isOwner: boolean;
}

/** Every badge, by category, in one card. Visitors see what's held; the
 *  owner also sees how far along the rest are, and pins the ones that sit
 *  beside their level. */
const BadgesView = ({ username, isOwner }: BadgesViewProps) => {
    const { data, isLoading } = usePlayerBadges(username);
    const { data: progress } = useProgress();
    const notify = useNotify();
    const setStyle = useSetStyle();
    const [pinned, setPinned] = useState<string[] | null>(null);
    const best = useMemo(() => (data ? bestOf(data) : new Map()), [data]);

    if (isLoading || !data) return <Skeleton className="h-96 rounded-lg" />;

    const showcase = pinned ?? data.showcase;
    const slots = progress?.look.showcaseSlots ?? 0;
    const values = new Map(data.progress?.map((p) => [p.badge, p.value]));
    const total = ALL.filter((b) => !b.secret).length;

    const togglePin = (key: string) => {
        const next = showcase.includes(key)
            ? showcase.filter((k) => k !== key)
            : [...showcase, key];
        if (next.length > slots) {
            notify(
                `Your showcase holds ${slots}. More slots are in the shop.`,
                "info"
            );
            return;
        }
        setPinned(next);
        setStyle.mutate(
            { showcase: next as BadgeKey[] },
            {
                onError: (error) => {
                    setPinned(null);
                    notify(
                        error instanceof ApiError
                            ? error.message
                            : "Couldn't save your showcase",
                        "error"
                    );
                },
            }
        );
    };

    return (
        <section
            aria-label="Badges"
            className={cardClass("flex flex-col gap-5", { padding: "default" })}
        >
            <p className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-label text-content-muted">
                <span>
                    <span className="font-display text-[20px] font-bold text-content tabular-nums">
                        {best.size}
                    </span>{" "}
                    {isOwner
                        ? `of ${total} badges`
                        : best.size === 1
                          ? "badge"
                          : "badges"}
                </span>
                {isOwner && (
                    <span className="inline-flex items-center gap-1.5">
                        <Pin size={13} aria-hidden />
                        {showcase.length} of {slots} pinned beside your level
                    </span>
                )}
            </p>

            <div className="gap-6 sm:columns-2 lg:columns-3">
                {BADGE_CATEGORIES.map((category) => {
                    const badges = ALL.filter(
                        (b) =>
                            b.category === category &&
                            // A visitor sees what's held; a secret stays one.
                            (best.has(b.key) || (isOwner && !b.secret))
                    );
                    const secrets = isOwner
                        ? ALL.filter(
                              (b) =>
                                  b.category === category &&
                                  b.secret &&
                                  !best.has(b.key)
                          ).length
                        : 0;
                    if (badges.length === 0 && secrets === 0) return null;
                    return (
                        <section
                            key={category}
                            className="mb-5 break-inside-avoid"
                        >
                            <h3 className="mb-1 font-mono text-[11px] tracking-[0.15em] text-content-muted uppercase">
                                {CATEGORY_LABELS[category]}
                            </h3>
                            <ul className="divide-y divide-subtle">
                                {badges.map((b) => (
                                    <BadgeRow
                                        key={b.key}
                                        badge={b}
                                        held={best.get(b.key) ?? null}
                                        value={values.get(b.key)}
                                        pin={
                                            isOwner && best.has(b.key)
                                                ? {
                                                      on: showcase.includes(
                                                          b.key
                                                      ),
                                                      toggle: () =>
                                                          togglePin(b.key),
                                                  }
                                                : undefined
                                        }
                                    />
                                ))}
                                {secrets > 0 && (
                                    <li className="flex items-center gap-2.5 py-2">
                                        <BadgeMedal
                                            badge={{ ...ALL[0]!, secret: true }}
                                            metal={null}
                                            size="sm"
                                        />
                                        <span className="text-label text-content-muted">
                                            {secrets === 1
                                                ? "A secret badge to find"
                                                : `${secrets} secret badges to find`}
                                        </span>
                                    </li>
                                )}
                            </ul>
                        </section>
                    );
                })}
            </div>
        </section>
    );
};

const BadgeRow = ({
    badge,
    held,
    value,
    pin,
}: {
    badge: BadgeDef;
    held: { metal: Metal; rarity: number } | null;
    value: number | undefined;
    pin?: { on: boolean; toggle: () => void };
}) => {
    const next = nextTier(badge, held?.metal ?? null);
    const previousAt =
        badge.tiers.filter((t) => held && t.metal <= held.metal).at(-1)?.at ??
        0;
    const progress =
        next && value !== undefined
            ? Math.max(
                  0,
                  Math.min(1, (value - previousAt) / (next.at - previousAt))
              )
            : undefined;

    return (
        <li className="flex items-center gap-2.5 py-2">
            <BadgeMedal
                badge={badge}
                metal={held?.metal ?? null}
                size="sm"
                progress={held ? undefined : progress}
            />
            <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-1.5">
                    <span
                        className={cn(
                            "truncate text-body-sm font-medium",
                            held ? "text-content" : "text-content-secondary"
                        )}
                    >
                        {badge.name}
                    </span>
                    {held && (
                        <span
                            className={cn(
                                "font-mono text-[10px] font-bold tracking-wider uppercase",
                                METAL_TEXT[held.metal]
                            )}
                        >
                            {METALS[held.metal - 1]}
                        </span>
                    )}
                </span>
                <span className="block truncate text-[12px] leading-snug text-content-muted">
                    {next
                        ? badgeText(badge, next.metal)
                        : badgeText(badge, held!.metal)}
                    {next && value !== undefined && badge.tiers.length > 1 && (
                        <span className="font-mono tabular-nums">
                            {" "}
                            · {formatCount(Math.min(value, next.at))}/
                            {formatCount(next.at)}
                        </span>
                    )}
                    {held && !next && ` · ${rarityText(held.rarity)}`}
                </span>
            </span>
            {pin && (
                <button
                    type="button"
                    aria-pressed={pin.on}
                    aria-label={
                        pin.on ? `Unpin ${badge.name}` : `Pin ${badge.name}`
                    }
                    onClick={pin.toggle}
                    className={cn(
                        "relative grid size-7 shrink-0 cursor-pointer place-items-center rounded-full before:absolute before:-inset-2 before:content-['']",
                        "focus-visible:outline-2 focus-visible:outline-brand",
                        pin.on
                            ? "bg-brand-subtle text-brand"
                            : "text-content-muted hover:bg-surface-hover hover:text-content"
                    )}
                >
                    <Pin
                        size={14}
                        fill={pin.on ? "currentColor" : "none"}
                        aria-hidden
                    />
                </button>
            )}
        </li>
    );
};

export default BadgesView;
