import type { BadgeDef, Metal, PlayerBadges } from "@playrates/shared";
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

/** The badges a member pinned, in a row. */
const ShowcaseView = ({
    badges,
    size = "sm",
    className,
}: {
    badges: ShownBadge[];
    size?: "sm" | "md";
    className?: string;
}) => (
    <ul className={cn("flex flex-wrap items-center gap-1.5", className)}>
        {badges.map(({ def, metal }) => (
            <li key={def.key} title={def.name}>
                <BadgeMedal badge={def} metal={metal} size={size} />
            </li>
        ))}
    </ul>
);

export default ShowcaseView;
