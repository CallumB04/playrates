import { useEffect, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import {
    BADGE_CATEGORIES,
    BADGES,
    METALS,
    badgeDef,
    type BadgeCategory,
    type BadgeDef,
    type BadgeKey,
    type Metal,
} from "@playrates/shared";
import { ApiError } from "../../../api";
import Button from "../../../components/ui/Button";
import { cardClass } from "../../../components/ui/Card";
import { Skeleton } from "../../../components/ui/Skeleton";
import BadgeMedal from "../../../components/progress/BadgeMedal";
import { bestOf } from "../../../components/progress/ShowcaseView";
import {
    badgeText,
    nextTier,
    rarityText,
} from "../../../components/progress/badgeText";
import { useNotify } from "../../../contexts/NotificationContext";
import {
    usePlayerBadges,
    useProgress,
    useSetStyle,
} from "../../../hooks/queries/useProgress";
import { formatCount } from "../../../lib/format";
import { cn } from "../../../lib/cn";
import { useEditParam } from "../lib/useEditParam";

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
/** Every tier of every badge, secret ones included: the most anyone can
 *  hold. */
const ALL_TIERS = ALL.reduce((n, b) => n + b.tiers.length, 0);

/* The medal colours follow the theme; a metallic sweep washes out on a
   light page at this size. */
const METAL_TEXT: Record<Metal, string> = {
    1: "text-medal-bronze",
    2: "text-medal-silver",
    3: "text-medal-gold",
    4: "text-brand",
};

const METAL_LABELS: Record<Metal, string> = {
    1: "Bronze",
    2: "Silver",
    3: "Gold",
    4: "Platinum",
};

interface BadgesViewProps {
    username: string;
    isOwner: boolean;
}

/** Every badge, by category. Visitors see what's held, and how many members
 *  share it; the owner also sees how far along each one is, and picks the
 *  ones pinned beside their level from the card at the top. */
const BadgesView = ({ username, isOwner }: BadgesViewProps) => {
    const { data, isLoading } = usePlayerBadges(username);
    const { data: progress } = useProgress();
    const notify = useNotify();
    const setStyle = useSetStyle();
    // The pins being chosen, in order; null while not choosing.
    const [picking, setPicking] = useState<string[] | null>(null);
    const best = useMemo(() => (data ? bestOf(data) : new Map()), [data]);
    const [asked, doneAsking] = useEditParam("showcase");
    // Opened by a link, once the badges it starts from are in.
    useEffect(() => {
        if (data && asked && isOwner) setPicking((p) => p ?? data.showcase);
    }, [data, asked, isOwner]);

    if (isLoading || !data) return <Skeleton className="h-96 rounded-lg" />;

    const showcase = picking ?? data.showcase;
    const slots = progress?.look.showcaseSlots ?? 0;
    const values = new Map(data.progress?.map((p) => [p.badge, p.value]));
    const byMetal = ([1, 2, 3, 4] as Metal[]).map(
        (metal) =>
            [metal, data.held.filter((h) => h.metal === metal).length] as const
    );

    const toggle = (key: string) =>
        setPicking((p) =>
            !p
                ? p
                : p.includes(key)
                  ? p.filter((k) => k !== key)
                  : p.length < slots
                    ? [...p, key]
                    : p
        );

    const save = () =>
        picking &&
        setStyle.mutate(
            { showcase: picking as BadgeKey[] },
            {
                onSuccess: () => {
                    setPicking(null);
                    doneAsking();
                },
                onError: (error) =>
                    notify(
                        error instanceof ApiError
                            ? error.message
                            : "Couldn't save your pins",
                        "error"
                    ),
            }
        );

    return (
        <div className="flex flex-col gap-4 lg:gap-6">
            {isOwner && (
                <section
                    aria-label="Pinned badges"
                    className={cardClass(
                        cn(
                            "flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5",
                            picking && "border-brand/50"
                        )
                    )}
                >
                    <div className="min-w-0 sm:w-52">
                        <h2 className="text-label text-content-muted">
                            Pinned beside your level
                        </h2>
                        <p className="mt-0.5 text-label-sm text-content-muted">
                            {picking
                                ? `Tap badges below, in order. ${picking.length} of ${slots}.`
                                : "Shown on your profile's Level card."}
                        </p>
                    </div>
                    <ul className="flex flex-wrap items-center gap-2">
                        {Array.from({ length: slots }, (_, i) => {
                            const key = showcase[i];
                            const def = key ? badgeDef(key) : undefined;
                            const held = key ? best.get(key) : undefined;
                            return (
                                <li key={key ?? `empty-${i}`}>
                                    {def && held ? (
                                        <BadgeMedal
                                            badge={def}
                                            metal={held.metal}
                                            size="md"
                                        />
                                    ) : (
                                        <span className="block size-11 rounded-full border border-dashed border-strong" />
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                    <div className="flex gap-2 sm:ml-auto">
                        {picking ? (
                            <>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => {
                                        setPicking(null);
                                        doneAsking();
                                    }}
                                    className="flex-1 max-sm:min-h-11 sm:flex-none"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={save}
                                    disabled={setStyle.isPending}
                                    className="flex-1 max-sm:min-h-11 sm:flex-none"
                                >
                                    Save
                                </Button>
                            </>
                        ) : (
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setPicking(data.showcase)}
                                className="w-full max-sm:min-h-11 sm:w-auto"
                            >
                                <Pencil size={14} aria-hidden />
                                Edit
                            </Button>
                        )}
                    </div>
                </section>
            )}

            <section
                aria-label="Badges"
                className={cardClass("flex flex-col gap-6")}
            >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <p className="text-label text-content-muted">
                        <span className="font-display text-[28px] leading-none font-bold text-content tabular-nums">
                            {data.held.length}
                        </span>{" "}
                        of {ALL_TIERS} badges
                    </p>
                    <dl className="flex flex-wrap gap-x-4 gap-y-1">
                        {byMetal.map(([metal, count]) => (
                            <div
                                key={metal}
                                className="flex items-center gap-1.5"
                            >
                                <span
                                    aria-hidden
                                    className={cn(
                                        "size-2.5 rounded-full bg-[var(--metal-mid)]",
                                        `metal-${METALS[metal - 1]}`
                                    )}
                                />
                                <dd className="font-mono text-label font-semibold text-content tabular-nums">
                                    {count}
                                </dd>
                                <dt className="text-label-sm text-content-muted">
                                    {METAL_LABELS[metal]}
                                </dt>
                            </div>
                        ))}
                    </dl>
                </div>

                <div className="gap-10 md:columns-2">
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
                                className="mb-6 break-inside-avoid"
                            >
                                <h3 className="mb-1 font-mono text-[11px] tracking-[0.15em] text-content-muted uppercase">
                                    {CATEGORY_LABELS[category]}
                                </h3>
                                <ul>
                                    {badges.map((b) => (
                                        <BadgeRow
                                            key={b.key}
                                            badge={b}
                                            held={best.get(b.key) ?? null}
                                            value={values.get(b.key)}
                                            pick={
                                                picking
                                                    ? {
                                                          order:
                                                              picking.indexOf(
                                                                  b.key
                                                              ) + 1,
                                                          full:
                                                              picking.length >=
                                                              slots,
                                                          toggle: () =>
                                                              toggle(b.key),
                                                      }
                                                    : undefined
                                            }
                                        />
                                    ))}
                                    {secrets > 0 && (
                                        <li className="flex items-center gap-3 py-2.5">
                                            <BadgeMedal
                                                badge={{
                                                    ...ALL[0]!,
                                                    secret: true,
                                                }}
                                                metal={null}
                                                size="md"
                                                className="m-1"
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
        </div>
    );
};

const BadgeRow = ({
    badge,
    held,
    value,
    pick,
}: {
    badge: BadgeDef;
    held: { metal: Metal; rarity: number } | null;
    value: number | undefined;
    /** While pins are being chosen: its place in the order, 0 for none. */
    pick?: { order: number; full: boolean; toggle: () => void };
}) => {
    const next = nextTier(badge, held?.metal ?? null);
    // Round the ring to the next metal's mark from nothing, so 10 of the
    // way to silver's 20 reads as half way.
    const progress =
        value !== undefined
            ? next
                ? Math.min(1, value / next.at)
                : 1
            : undefined;
    const choosable = !!pick && !!held && (pick.order > 0 || !pick.full);

    const body = (
        <>
            <span className="relative shrink-0">
                <BadgeMedal
                    badge={badge}
                    metal={held?.metal ?? null}
                    size="md"
                    progress={pick ? undefined : progress}
                    className="m-1"
                />
                {pick && pick.order > 0 && (
                    <span className="absolute -top-0.5 -left-0.5 grid size-5 place-items-center rounded-full bg-brand text-label-sm font-semibold text-content-on-solid shadow-plate">
                        {pick.order}
                    </span>
                )}
            </span>
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
                </span>
                <span className="block truncate font-mono text-[11px] leading-snug text-content-muted tabular-nums">
                    {[
                        next && value !== undefined
                            ? `${formatCount(Math.min(value, next.at))} / ${formatCount(next.at)}`
                            : null,
                        held ? rarityText(held.rarity) : null,
                    ]
                        .filter(Boolean)
                        .join(" · ")}
                </span>
            </span>
        </>
    );

    if (!pick)
        return <li className="flex items-center gap-3 py-2.5">{body}</li>;
    return (
        <li>
            <button
                type="button"
                onClick={pick.toggle}
                disabled={!choosable}
                aria-pressed={pick.order > 0}
                className={cn(
                    "flex w-full cursor-pointer items-center gap-3 rounded-md px-1.5 py-2 text-left disabled:cursor-not-allowed",
                    "focus-visible:outline-2 focus-visible:outline-brand",
                    pick.order > 0
                        ? "bg-brand-subtle"
                        : choosable
                          ? "hover:bg-surface-hover"
                          : "opacity-45"
                )}
            >
                {body}
            </button>
        </li>
    );
};

export default BadgesView;
