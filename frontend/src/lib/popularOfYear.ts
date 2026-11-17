import { hubFilters, type GameSort } from "@playrates/shared";

/**
 * A year's games people know best, its most logged, for the pictures that
 * stand for its best: the Library menu's and the Best of page's. Not the
 * page's own critic order, where a top score from a handful of reviews puts
 * a game few know first. One query for both, so they share it.
 */
export const popularOfYear = (year: number, limit = 6) => ({
    ...hubFilters({ kind: "year", year }),
    sort: "logged" as GameSort,
    page: 1,
    limit,
});
