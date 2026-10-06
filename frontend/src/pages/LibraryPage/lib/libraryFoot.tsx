import type { ReactNode } from "react";
import type { Game, GameSort } from "@playrates/shared";
import type { GameLogSummary } from "@playrates/shared";
import { formatCount, releaseYear } from "../../../lib/format";
import CriticScore from "../../../lib/criticScore";

/** What a tile prints under its cover, the way a profile shelf does. A rating
 *  comes back as a number for the badge; everything else is already text. */
export interface LibraryFoot {
    rating?: number | null;
    value?: ReactNode;
}

/**
 * The library shows whatever it is ordered by, so the ordering is legible.
 *
 * Title is the exception, having nothing of its own to show — the titles are
 * right there — so it keeps the tile's resting figure: the viewer's own
 * rating where they have logged the game, and the release year otherwise.
 */
export const libraryFoot = (
    game: Game,
    sort: GameSort,
    log?: Pick<GameLogSummary, "rating">
): LibraryFoot => {
    switch (sort) {
        case "logged":
            return {
                // The bare number reads as a rating or a year otherwise.
                value: `${formatCount(game.logCount)} ${
                    game.logCount === 1 ? "log" : "logs"
                }`,
            };
        case "rating":
            return { rating: game.avgRating };
        case "critic":
            // The same coloured box as on the game page.
            return { value: <CriticScore score={game.criticScore} /> };
        case "released":
            return { value: releaseYear(game.releaseDate) };
        case "title":
            return log
                ? { rating: log.rating }
                : { value: releaseYear(game.releaseDate) };
    }
};
