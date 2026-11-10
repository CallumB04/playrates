import type { ReactNode } from "react";
import type {
    GameLogSort,
    GameStatus,
    PlayedStatus,
    ShelfEntry,
    SortDirection,
} from "@playrates/shared";
import {
    formatHours,
    formatMonthYearShort,
    formatPercent,
    releaseYear,
} from "../../../lib/format";
import CriticScore from "../../../lib/criticScore";
import { completionTone } from "../../../lib/completionTone";
import { STATUS_PRESENTATION } from "../../../constants/gameStatus";
import HypeFlames from "../../../components/gamelog/HypeFlames";

interface SortOption {
    value: GameLogSort;
    label: string;
    /** Wording for the direction toggle, which reads wrong as "ascending". */
    ascending: string;
    descending: string;
}

const HIGH_LOW = { ascending: "Lowest first", descending: "Highest first" };
const OLD_NEW = { ascending: "Oldest first", descending: "Newest first" };

const HYPE: SortOption = {
    value: "hype",
    label: "Hype",
    ascending: "Least hyped first",
    descending: "Most hyped first",
};

/**
 * Ordered as the menu shows them: the scores, then time, then the rest.
 *
 * The first label depends on whose shelf it is — "Your rating" is wrong on
 * someone else's profile, where the figure is theirs. Only the played shelf
 * has endings to sort by, and only the backlog has hype, first as its
 * default.
 */
export const shelfSortOptions = (
    isMyAccount: boolean,
    shelf: GameStatus
): SortOption[] => [
    ...(shelf === "backlog" ? [HYPE] : []),
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
    ...(shelf === "played"
        ? [
              {
                  value: "ending" as const,
                  label: "How it ended",
                  ascending: "Mastered last",
                  descending: "Mastered first",
              },
          ]
        : []),
];

/** What a shelf is ordered by until someone picks: a backlog has no
 *  ratings to speak of, so it goes by how much each game is wanted. */
export const defaultShelfSort = (shelf: GameStatus): GameLogSort =>
    shelf === "backlog" ? "hype" : "rating";

/** The shelf's sort, unless it's one this shelf doesn't offer. */
export const sortForShelf = (
    sort: GameLogSort,
    shelf: GameStatus
): GameLogSort =>
    (sort === "ending" && shelf !== "played") ||
    (sort === "hype" && shelf !== "backlog")
        ? defaultShelfSort(shelf)
        : sort;

/** Best first, as ending_rank orders them in the database. */
const ENDINGS: PlayedStatus[] = ["mastered", "finished", "shelved", "retired"];

export const directionLabel = (
    sort: GameLogSort,
    direction: SortDirection
): string => {
    const options = [...shelfSortOptions(true, "played"), HYPE];
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
export const shelfFoot = (
    entry: ShelfEntry,
    sort: GameLogSort,
    shelf: GameStatus = "played"
): ShelfFoot => {
    const { game, rollup } = entry;
    // Titles have nothing of their own to show: the shelf's default does.
    if (sort === "title" && shelf === "backlog")
        return shelfFoot(entry, "hype");
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
            // In its band's colour, as the log's ring shows it.
            return {
                value:
                    rollup.completion === null ? (
                        "–"
                    ) : (
                        <span
                            className={completionTone(rollup.completion).text}
                        >
                            {formatPercent(rollup.completion)}
                        </span>
                    ),
            };
        case "ending": {
            // The best of its played logs', which is what it sorted on.
            const ended = entry.logs
                .filter((l) => l.status === "played")
                .map((l) => l.playedStatus);
            const best = ENDINGS.find((e) => ended.includes(e));
            if (!best) return { value: ended.length ? "Played" : "–" };
            const { label, markTone } = STATUS_PRESENTATION[best];
            return { value: <span className={markTone}>{label}</span> };
        }
        // The most hyped of its backlog logs', which is what it sorted on.
        case "hype":
            return {
                value:
                    rollup.hype == null ? (
                        "–"
                    ) : (
                        <HypeFlames hype={rollup.hype} />
                    ),
            };
        case "rating":
        case "title":
            return { rating: rollup.rating };
    }
};
