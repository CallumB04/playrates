import type { GameLogSort, SortDirection } from "@playrates/shared";
import type { GameLogWithGame } from "../../../api";
import {
    formatMonthYearShort,
    formatPercent,
    releaseYear,
} from "../../../lib/format";

interface SortOption {
    value: GameLogSort;
    label: string;
    /** Wording for the direction toggle, which reads wrong as "ascending". */
    ascending: string;
    descending: string;
}

/** Ordered as the menu shows them: the two ratings, then time, then the rest. */
export const SHELF_SORTS: SortOption[] = [
    {
        value: "rating",
        label: "Your rating",
        ascending: "Lowest first",
        descending: "Highest first",
    },
    {
        value: "gameRating",
        label: "Average rating",
        ascending: "Lowest first",
        descending: "Highest first",
    },
    {
        value: "played",
        label: "Recently played",
        ascending: "Oldest first",
        descending: "Newest first",
    },
    {
        value: "title",
        label: "Title",
        ascending: "A to Z",
        descending: "Z to A",
    },
    {
        value: "released",
        label: "Release date",
        ascending: "Oldest first",
        descending: "Newest first",
    },
    {
        value: "completion",
        label: "Completion",
        ascending: "Least first",
        descending: "Most first",
    },
];

export const directionLabel = (
    sort: GameLogSort,
    direction: SortDirection
): string => {
    const option = SHELF_SORTS.find((s) => s.value === sort) ?? SHELF_SORTS[0]!;
    return direction === "asc" ? option.ascending : option.descending;
};

/**
 * What a tile prints under its cover. A rating is handed back as a number for
 * the rating badge; everything else is already formatted text.
 *
 * Sorting by title is the one case with nothing of its own to show — the
 * titles are right there — so it keeps the rating, which is what the shelf
 * shows by default.
 */
export interface ShelfFoot {
    rating?: number | null;
    value?: string;
}

export const shelfFoot = (
    log: GameLogWithGame,
    sort: GameLogSort
): ShelfFoot => {
    switch (sort) {
        case "gameRating":
            return { rating: log.game?.avgRating ?? null };
        case "played":
            return { value: formatMonthYearShort(log.updatedAt) };
        case "released":
            return { value: releaseYear(log.game?.releaseDate) };
        case "completion":
            return {
                value: log.achievementsTotal
                    ? formatPercent(
                          (log.achievementsCompleted ?? 0) /
                              log.achievementsTotal
                      )
                    : "—",
            };
        case "rating":
        case "title":
            return { rating: log.rating };
    }
};
