import type {
    BadgeDef,
    Metal,
    PlayerBadges,
    ShowcaseLayout,
} from "@playrates/shared";
import { badgeDef } from "@playrates/shared";
import BadgeMedal from "./BadgeMedal";
import { cn } from "../../lib/cn";

export interface ShownBadge {
    def: BadgeDef;
    metal: Metal;
}

/** The best metal held of each badge. */
export const bestOf = (data: PlayerBadges) => {
    const best = new Map<string, { metal: Metal; rarity: number }>();
    for (const h of data.held) {
        const was = best.get(h.badge);
        if (!was || h.metal > was.metal)
            best.set(h.badge, { metal: h.metal, rarity: h.rarity });
    }
    return best;
};

/** The pinned badges, best metal each, in the order they were pinned. */
export const showcaseOf = (data: PlayerBadges): ShownBadge[] => {
    const best = bestOf(data);
    return data.showcase.flatMap((key) => {
        const def = badgeDef(key);
        const held = best.get(key);
        return def && held ? [{ def, metal: held.metal }] : [];
    });
};

const MEDAL = {
    sm: { base: "sm", lead: "md", plinth: "w-7" },
    md: { base: "md", lead: "lg", plinth: "w-10" },
} as const;

/**
 * The showcase in the layout its owner wears, always on one line so it can
 * sit beside a level: a plain row, a shelf with each badge on a plinth, or
 * the first badge larger in a pool of light.
 */
const ShowcaseView = ({
    layout,
    badges,
    size = "sm",
    className,
}: {
    layout: ShowcaseLayout;
    badges: ShownBadge[];
    size?: keyof typeof MEDAL;
    className?: string;
}) => {
    const m = MEDAL[size];
    if (layout === "layout_shelf") {
        return (
            <span className={cn("inline-flex flex-col", className)}>
                <ul className="flex items-end gap-1.5 px-1.5">
                    {badges.map(({ def, metal }) => (
                        <li
                            key={def.key}
                            title={def.name}
                            className="flex flex-col items-center"
                        >
                            <BadgeMedal
                                badge={def}
                                metal={metal}
                                size={m.base}
                            />
                            <span
                                aria-hidden
                                className={cn(
                                    "mt-0.5 h-1 rounded-[50%] bg-content-muted/30",
                                    m.plinth
                                )}
                            />
                        </li>
                    ))}
                </ul>
                <span
                    aria-hidden
                    className="block h-1.5 rounded-full bg-linear-to-b from-surface-raised to-surface-sunken shadow-plate ring-1 ring-subtle"
                />
            </span>
        );
    }
    const spotlight = layout === "layout_spotlight";
    return (
        <ul className={cn("flex items-center gap-1.5", className)}>
            {badges.map(({ def, metal }, i) => (
                <li key={def.key} title={def.name} className="relative">
                    {spotlight && i === 0 && (
                        <span
                            aria-hidden
                            className="absolute inset-0 scale-[1.9] rounded-full bg-[radial-gradient(circle,var(--glow-brand),transparent_65%)]"
                        />
                    )}
                    <BadgeMedal
                        badge={def}
                        metal={metal}
                        size={spotlight && i === 0 ? m.lead : m.base}
                        className={cn(
                            "relative",
                            spotlight && i === 0 && "mr-1.5"
                        )}
                    />
                </li>
            ))}
        </ul>
    );
};

export default ShowcaseView;
