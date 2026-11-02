import type { WishlistEntry } from "@playrates/shared";

/** The order with one game moved to a place, counted from 1 and held to
 *  the list's ends. Top, up, down, bottom and "Move to #" are all this. */
export const moveTo = (
    order: number[],
    gameId: number,
    place: number
): number[] => {
    const from = order.indexOf(gameId);
    if (from < 0) return order;
    const to = Math.min(Math.max(place, 1), order.length) - 1;
    if (to === from) return order;
    const next = order.filter((id) => id !== gameId);
    next.splice(to, 0, gameId);
    return next;
};

/** What narrows a wishlist, as the shelves' own filters narrow them on
 *  the server. `common` is the viewer's logged games, to keep only those. */
export interface WishlistFilters {
    console?: string;
    q?: string;
    genre?: string;
    common?: ReadonlySet<number>;
}

export const wishlistFiltered = ({
    console: consoleSlug,
    q,
    genre,
    common,
}: WishlistFilters) => !!(consoleSlug || q?.trim() || genre || common);

export const narrowWishlist = <T extends WishlistEntry>(
    entries: T[],
    { console: consoleSlug, q, genre, common }: WishlistFilters
): T[] => {
    const term = q?.trim().toLocaleLowerCase();
    return entries.filter(
        (e) =>
            (!consoleSlug || e.consoles.includes(consoleSlug)) &&
            (!term ||
                (e.game?.title ?? "").toLocaleLowerCase().includes(term)) &&
            (!genre || (e.genres ?? []).includes(genre)) &&
            (!common || common.has(e.gameId))
    );
};

export const WISHLIST_SORTS = ["rank", "added", "released", "title"] as const;
export type WishlistSort = (typeof WISHLIST_SORTS)[number];

export const WISHLIST_SORT_LABELS: Record<WishlistSort, string> = {
    rank: "Your order",
    added: "Recently added",
    released: "Release date",
    title: "Title",
};

/** The wishlist in another order than its owner's, without losing the
 *  ranks: each entry keeps the place it has in theirs. Newest first for
 *  dates, as the shelves do; a game with no date goes last. */
export const sortWishlist = (
    entries: WishlistEntry[],
    sort: WishlistSort
): WishlistEntry[] => {
    if (sort === "rank") return entries;
    const latest = (value: string | null | undefined) =>
        value ? Date.parse(value) : -Infinity;
    const byDate = (pick: (e: WishlistEntry) => string | null | undefined) =>
        [...entries].sort((a, b) => latest(pick(b)) - latest(pick(a)));

    switch (sort) {
        case "added":
            return byDate((e) => e.rollup.addedAt);
        case "released":
            return byDate((e) => e.game?.releaseDate);
        case "title":
            return [...entries].sort((a, b) =>
                (a.game?.title ?? "").localeCompare(b.game?.title ?? "")
            );
    }
};
