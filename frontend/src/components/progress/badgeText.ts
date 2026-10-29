import type { BadgeDef, Metal } from "@playrates/shared";

/** A badge's line for a metal, its threshold filled in. */
export const badgeText = (badge: BadgeDef, metal: Metal): string => {
    const tier = badge.tiers.find((t) => t.metal === metal) ?? badge.tiers[0];
    const n = tier?.at ?? 0;
    // "(s)" marks a word that's plural unless the threshold is 1.
    return badge.description
        .replace("{n}", n.toLocaleString("en-GB"))
        .replace(/\(s\)/g, n === 1 ? "" : "s");
};

/** The next metal to reach, or null when it's all earned. */
export const nextTier = (badge: BadgeDef, held: Metal | null) =>
    badge.tiers.find((t) => held === null || t.metal > held) ?? null;

/** How many members hold a badge at this metal, said plainly. */
export const rarityText = (rarity: number) =>
    rarity >= 0.995
        ? "Everyone has this"
        : `${rarity < 0.01 ? "<1" : Math.round(rarity * 100)}% of members`;
