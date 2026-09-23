import type { ReactNode } from "react";
import type { Game, Genre, Platform } from "@playrates/shared";
import PlatformMarks from "../../../components/game/PlatformMarks";
import InlineNameList from "../components/InlineNameList";
import { formatDate } from "../../../lib/format";

export interface Fact {
    label: string;
    value: ReactNode;
}

const nameFor = <T extends { slug: string }>(
    slugs: string[],
    lookup: T[],
    name: (item: T) => string
): string[] => {
    const bySlug = new Map(lookup.map((item) => [item.slug, item]));
    return slugs.map((slug) => {
        const match = bySlug.get(slug);
        return match ? name(match) : slug;
    });
};

/** Hostname only. A full URL is unreadable in a ledger column and a studio's
 *  site is recognisable without its path. */
const siteName = (url: string): string => {
    try {
        return new URL(url).hostname.replace(/^www\./, "");
    } catch {
        return url;
    }
};

/** The ledger under the cover. Pure, so the rows are testable without a
 *  render. Empty rows are dropped rather than printed as a dash. */
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
            value: (
                <PlatformMarks
                    slugs={game.platforms}
                    platforms={platforms}
                    max={6}
                    className="justify-end text-content"
                />
            ),
        });
    }
    if (game.developers.length > 0) {
        facts.push({
            label: game.developers.length > 1 ? "Developers" : "Developer",
            value: <InlineNameList noun="developers" names={game.developers} />,
        });
    }
    /* Dropped when it only repeats the developer, which is most self-published
       games — a row saying the same thing twice is noise. */
    if (
        game.publishers.length > 0 &&
        game.publishers.join() !== game.developers.join()
    ) {
        facts.push({
            label: game.publishers.length > 1 ? "Publishers" : "Publisher",
            value: <InlineNameList noun="publishers" names={game.publishers} />,
        });
    }
    if (game.genres.length > 0) {
        facts.push({
            label: "Genres",
            value: (
                <InlineNameList
                    noun="genres"
                    names={nameFor(game.genres, genres, (g) => g.name)}
                />
            ),
        });
    }
    if (game.esrbRating) {
        facts.push({ label: "Rated", value: game.esrbRating });
    }
    if (game.website) {
        facts.push({
            label: "Website",
            value: (
                <a
                    href={game.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate underline decoration-subtle underline-offset-2 hover:decoration-current"
                >
                    {siteName(game.website)}
                </a>
            ),
        });
    }
    // External scores live in the main column, labelled as external.

    return facts;
};
