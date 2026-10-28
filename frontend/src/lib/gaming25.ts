import {
    GAMING_25_CATEGORIES,
    GAMING_25_CENTRE,
    type Gaming25Category,
} from "@playrates/shared";

const ORDER = new Map<string, number>(
    GAMING_25_CATEGORIES.map((c, i) => [c.key, i])
);

/** Picks in the grid's order, read across. */
export const inGridOrder = <T extends { category: Gaming25Category }>(
    picks: T[]
): T[] =>
    [...picks].sort((a, b) => ORDER.get(a.category)! - ORDER.get(b.category)!);

export interface Gaming25Cell<G> {
    category: Gaming25Category;
    label: string;
    game: G | null;
    centre: boolean;
}

/** All 25 cells, filled or not. */
export const gridCells = <G>(
    picks: { category: Gaming25Category; game: G }[]
): Gaming25Cell<G>[] => {
    const byCategory = new Map(picks.map((p) => [p.category, p.game]));
    return GAMING_25_CATEGORIES.map(({ key, label }) => ({
        category: key,
        label,
        game: byCategory.get(key) ?? null,
        centre: key === GAMING_25_CENTRE,
    }));
};

/**
 * The next cell left to fill after `from`, reading on and coming round
 * again, so a run of picks walks the grid; null once every cell is full.
 */
export const nextEmpty = (
    filled: Iterable<Gaming25Category>,
    from: Gaming25Category
): Gaming25Category | null => {
    const done = new Set(filled);
    const start = ORDER.get(from)!;
    for (let step = 1; step <= GAMING_25_CATEGORIES.length; step++) {
        const { key } =
            GAMING_25_CATEGORIES[(start + step) % GAMING_25_CATEGORIES.length];
        if (!done.has(key)) return key;
    }
    return null;
};
