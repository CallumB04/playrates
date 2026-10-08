import type { ReactNode } from "react";
import type { GameLogSort, SortDirection } from "@playrates/shared";
import type { ShelfEntry } from "@playrates/shared";
import {
    formatHours,
    formatMonthYearShort,
    formatPercent,
    releaseYear,
} from "../../../lib/format";
import CriticScore from "../../../lib/criticScore";

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
    { value: "critic", label: "Critic score", ...HIGH_LOW },
    { value: "played", label: "Recently played", ...OLD_NEW },
    { value: "added", label: "Recently added", ...OLD_NEW },
    {
        value: "hoursPlayed",
        label: "Time played",
        ascending: "Least first",
        descending: "Most first",
    },
    {
        value: "hoursToBeat",
        label: "Time to beat",
        ascending: "Shortest first",
        descending: "Longest first",
    },
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
    value?: ReactNode;
}

/* A game logged on several consoles shows what it was ordered by: the
   mean rating, the latest play, the best completion, the total hours, the
   quickest beat. */
export const shelfFoot = (entry: ShelfEntry, sort: GameLogSort): ShelfFoot => {
    const { game, rollup } = entry;
    switch (sort) {
        case "gameRating":
            return { rating: game?.avgRating ?? null };
        case "critic":
            // The same coloured box as on the game page.
            return {
                value: <CriticScore score={game?.criticScore ?? null} />,
            };
        case "played":
            return { value: formatMonthYearShort(rollup.lastPlayed) };
        case "added":
            return { value: formatMonthYearShort(rollup.addedAt) };
        case "hoursPlayed":
            return { value: formatHours(rollup.hoursPlayed) };
        case "hoursToBeat":
            return { value: formatHours(rollup.quickestBeat?.hours) };
        case "released":
            return { value: releaseYear(game?.releaseDate) };
        case "completion":
            return {
                value:
                    rollup.completion === null
                        ? "—"
                        : formatPercent(rollup.completion),
            };
        case "rating":
        case "title":
            return { rating: rollup.rating };
    }
};
