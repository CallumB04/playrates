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
        };
        row.holders[(metal as Metal) - 1] += holders;
        row.total += holders;
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

export const reactionLabel = (reaction: string): string =>
    REACTIONS.find((r) => r.key === reaction)?.label ?? reaction;
