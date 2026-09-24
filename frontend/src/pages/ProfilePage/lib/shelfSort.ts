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

const HIGH_LOW = { ascending: "Lowest first", descending: "Highest first" };
const OLD_NEW = { ascending: "Oldest first", descending: "Newest first" };

/**
 * Ordered as the menu shows them: the scores, then time, then the rest.
 *
 * The first label depends on whose shelf it is — "Your rating" is wrong on
 * someone else's profile, where the figure is theirs.
 */
export const shelfSortOptions = (isMyAccount: boolean): SortOption[] => [
    {
        value: "rating",
        label: isMyAccount ? "Your rating" : "User rating",
        ...HIGH_LOW,
    },
    { value: "gameRating", label: "PlayRates average", ...HIGH_LOW },
    { value: "metacritic", label: "Metacritic", ...HIGH_LOW },
    { value: "played", label: "Recently played", ...OLD_NEW },
    {
        value: "title",
        label: "Title",
        ascending: "A to Z",
        descending: "Z to A",
    },
    { value: "released", label: "Release date", ...OLD_NEW },
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
    const options = shelfSortOptions(true);
    const option = options.find((s) => s.value === sort) ?? options[0]!;
    return direction === "asc" ? option.ascending : option.descending;
};

/** The later of the two dates, which is what the shelf orders by. Both are
 *  ISO, so a string sort is a date sort. */
export const lastPlayed = (log: GameLogWithGame): string | null =>
    [log.startDate, log.finishDate]
        .filter((date): date is string => !!date)
        .sort()
        .at(-1) ?? null;

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
        case "metacritic":
            return { value: log.game?.metacritic?.toString() ?? "—" };
        case "played":
            return { value: formatMonthYearShort(lastPlayed(log)) };
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
