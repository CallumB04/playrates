import type { BadgeDef, Metal } from "@playrates/shared";

// Shared with the server, which writes it on a badge's share picture.
export { badgeText } from "@playrates/shared";

/** The next metal to reach, or null when it's all earned. */
export const nextTier = (badge: BadgeDef, held: Metal | null) =>
    badge.tiers.find((t) => held === null || t.metal > held) ?? null;

/** How many members hold a badge at this metal, said plainly. */
export const rarityText = (rarity: number) =>
    rarity >= 0.995
        ? "Everyone has this"
        : `${rarity < 0.01 ? "<1" : Math.round(rarity * 100)}% of members`;
