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
    if (game.metacritic !== null) {
        facts.push({ label: "Metacritic", value: String(game.metacritic) });
    }
    if (game.rawgRating !== null) {
        facts.push({
            label: "Community",
            value: `${game.rawgRating.toFixed(1)} / 5`,
        });
    }
    if (game.playtimeHours !== null) {
        facts.push({
            label: "Avg. playtime",
            value: formatHours(game.playtimeHours),
        });
    }

    return facts;
};
