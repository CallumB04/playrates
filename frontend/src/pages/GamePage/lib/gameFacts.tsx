import type { ReactNode } from "react";
import type { Game, Genre, Platform } from "@playrates/shared";
import PlatformMarks from "../../../components/game/PlatformMarks";
import { formatDate } from "../../../lib/format";

export interface Fact {
    label: string;
    value: ReactNode;
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
    if (game.genres.length > 0) {
        facts.push({
            label: "Genres",
            value: nameFor(game.genres, genres, (g) => g.name),
        });
    }
    // External scores live in the main column, labelled as external.

    return facts;
};
