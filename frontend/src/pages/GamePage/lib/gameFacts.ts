import type { Game, Genre, Platform } from "@playrates/shared";
import { formatDate, formatHours } from "../../../lib/format";

export interface Fact {
    label: string;
    value: string;
}

const nameFor = <T extends { slug: string }>(
    slugs: string[],
    lookup: T[],
    name: (item: T) => string
): string => {
    if (slugs.length === 0) return "—";
    const bySlug = new Map(lookup.map((item) => [item.slug, item]));
    return slugs
        .map((slug) => {
            const match = bySlug.get(slug);
            return match ? name(match) : slug;
        })
        .join(" · ");
};

/**
 * The ledger under the cover. Pure, so the rows can be asserted without
 * rendering a page — and rows with nothing behind them are dropped rather
 * than printed as an em dash, because a ledger of blanks reads as broken.
 */
export const buildGameFacts = (
    game: Game,
    platforms: Platform[],
    genres: Genre[]
): Fact[] => {
    const facts: Fact[] = [];

    if (game.releaseDate) {
        facts.push({ label: "Released", value: formatDate(game.releaseDate) });
    }
    if (game.platforms.length > 0) {
        facts.push({
            label: "Platforms",
            value: nameFor(game.platforms, platforms, (p) => p.displayName),
        });
    }
    if (game.genres.length > 0) {
        facts.push({
            label: "Genres",
            value: nameFor(game.genres, genres, (g) => g.name),
        });
    }
    /* Metacritic, the RAWG community score and average playtime used to sit
       here. They are somebody else's numbers, and putting them under the
       cover gave them the same weight as this site's own. They live beside
       the PlayRates figures in the main column now, labelled as external. */

    return facts;
};

/**
 * Figures from elsewhere: Metacritic, RAWG's own community score, and RAWG's
 * average playtime. Kept apart from this site's numbers and labelled, so a
 * 4.3/5 from somewhere else is never mistaken for a PlayRates rating.
 */
export const buildExternalFacts = (game: Game): Fact[] => {
    const facts: Fact[] = [];

    if (game.metacritic !== null) {
        facts.push({ label: "Metacritic", value: String(game.metacritic) });
    }
    if (game.rawgRating !== null) {
        facts.push({
            label: "RAWG community",
            value: `${game.rawgRating.toFixed(1)} / 5`,
        });
    }
    if (game.playtimeHours !== null) {
        facts.push({
            label: "Typical playtime",
            value: formatHours(game.playtimeHours),
        });
    }

    return facts;
};
