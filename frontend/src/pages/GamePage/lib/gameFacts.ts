import type { Game, Genre, Platform } from "@playrates/shared";
import { formatDate } from "../../../lib/format";

export interface NamedSlug {
    slug: string;
    name: string;
}

/** The details under the cover. Anything a game has nothing for is null or
 *  empty, and the page leaves it out rather than printing a dash. */
export interface GameFacts {
    released: string | null;
    rated: string | null;
    platforms: NamedSlug[];
    genres: NamedSlug[];
    developers: string[];
    /** Empty when it only repeats the developers. */
    publishers: string[];
    website: { href: string; label: string } | null;
}

/** A name for each slug, or the slug itself while the lookup hasn't loaded
 *  or doesn't know it. */
const named = <T extends { slug: string }>(
    slugs: string[],
    lookup: T[],
    name: (item: T) => string
): NamedSlug[] => {
    const bySlug = new Map(lookup.map((item) => [item.slug, item]));
    return slugs.map((slug) => {
        const match = bySlug.get(slug);
        return { slug, name: match ? name(match) : slug };
    });
};

/** Hostname only: a studio's site is recognisable without its path. */
const siteName = (url: string): string => {
    try {
        return new URL(url).hostname.replace(/^www\./, "");
    } catch {
        return url;
    }
};

export const buildGameFacts = (
    game: Game,
    platforms: Platform[],
    genres: Genre[]
): GameFacts => ({
    released: game.releaseDate ? formatDate(game.releaseDate) : null,
    rated: game.esrbRating,
    platforms: named(game.platforms, platforms, (p) => p.displayName),
    genres: named(game.genres, genres, (g) => g.name),
    developers: game.developers,
    /* Most self-published games list the same name twice, and saying it
       twice is noise. */
    publishers:
        game.publishers.join() === game.developers.join()
            ? []
            : game.publishers,
    website: game.website
        ? { href: game.website, label: siteName(game.website) }
        : null,
});

export const hasFacts = (facts: GameFacts): boolean =>
    facts.released !== null ||
    facts.rated !== null ||
    facts.platforms.length > 0 ||
    facts.genres.length > 0 ||
    facts.developers.length > 0 ||
    facts.publishers.length > 0 ||
    facts.website !== null;
