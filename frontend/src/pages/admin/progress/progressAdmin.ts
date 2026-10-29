import {
    BADGES,
    REACTIONS,
    SHOP_ITEMS,
    type AdminProgress,
    type BadgeDef,
    type Metal,
} from "@playrates/shared";
import { SOURCE_LABELS } from "../../../components/progress/sources";

export interface BadgeRow {
    badge: BadgeDef;
    /** Holders at each metal, bronze first. */
    holders: [number, number, number, number];
    total: number;
    /** The best metal anyone holds it at, for its medal. */
    top: Metal;
}

/**
 * One row per badge anyone holds, its holders split by metal, most held
 * first. A badge no longer defined is left out rather than shown blank.
 */
export const badgeRows = (badges: AdminProgress["badges"]): BadgeRow[] => {
    const rows = new Map<string, BadgeRow>();
    for (const { badge, metal, holders } of badges) {
        const def = BADGES.find((b) => b.key === badge);
        if (!def) continue;
        const row = rows.get(badge) ?? {
            badge: def,
            holders: [0, 0, 0, 0],
            total: 0,
            top: 1,
        };
        row.holders[(metal as Metal) - 1] += holders;
        row.total += holders;
        if (holders > 0 && metal > row.top) row.top = metal as Metal;
        rows.set(badge, row);
    }
    return [...rows.values()].sort((a, b) => b.total - a.total);
};

export const shopLabel = (item: string): string => {
    if (item === "background") return "Profile background";
    const def = SHOP_ITEMS.find((i) => i.item === item);
    if (!def) return item;
    const group = def.group === "colour" ? "name colour" : def.group;
    return `${def.label} ${group}`;
};

export const sourceLabel = (source: string): string =>
    SOURCE_LABELS[source] ?? source;

/** XP by what it was for, as people would say it: two sources that read the
 *  same (a short review and a long one) are one row. Most XP first. */
export const sourceRows = (
    sources: AdminProgress["xpBySource"]
): { label: string; xp: number }[] => {
    const rows = new Map<string, number>();
    for (const { source, xp } of sources) {
        const label = sourceLabel(source);
        rows.set(label, (rows.get(label) ?? 0) + xp);
    }
    return [...rows]
        .map(([label, xp]) => ({ label, xp }))
        .sort((a, b) => b.xp - a.xp);
};

export const reactionLabel = (reaction: string): string =>
    REACTIONS.find((r) => r.key === reaction)?.label ?? reaction;
