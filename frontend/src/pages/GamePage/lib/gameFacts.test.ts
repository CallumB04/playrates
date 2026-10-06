import { describe, expect, it } from "vitest";
import type { Game, Genre, Platform } from "@playrates/shared";
import { buildGameFacts, hasFacts } from "./gameFacts";

const PLATFORMS: Platform[] = [
    { slug: "steam", displayName: "Steam", sortOrder: 1 },
    { slug: "xbox", displayName: "Xbox", sortOrder: 2 },
];

const GENRES: Genre[] = [
    { slug: "action", name: "Action" },
    { slug: "indie", name: "Indie" },
];

const game = (overrides: Partial<Game> = {}): Game =>
    ({
        id: 1,
        title: "Hollow Knight",
        coverUrl: null,
        releaseDate: "2017-02-24",
        platforms: ["steam"],
        genres: ["action"],
        developers: ["Team Cherry"],
        publishers: ["Team Cherry"],
        website: null,
        esrbRating: null,
        ...overrides,
    }) as Game;

const facts = (overrides: Partial<Game> = {}) =>
    buildGameFacts(game(overrides), PLATFORMS, GENRES);

describe("buildGameFacts", () => {
    it("formats the release date", () => {
        expect(facts().released).toBe("24 Feb 2017");
    });

    it("names platforms and genres, keeping their slugs for links", () => {
        const both = facts({ platforms: ["steam", "xbox"], genres: ["indie"] });
        expect(both.platforms).toEqual([
            { slug: "steam", name: "Steam" },
            { slug: "xbox", name: "Xbox" },
        ]);
        expect(both.genres).toEqual([{ slug: "indie", name: "Indie" }]);
    });

    it("falls back to the slug when a genre is not in the lookup", () => {
        expect(facts({ genres: ["roguelike"] }).genres).toEqual([
            { slug: "roguelike", name: "roguelike" },
        ]);
    });

    it("still lists genres when the lookup has not loaded", () => {
        expect(buildGameFacts(game(), PLATFORMS, []).genres).toEqual([
            { slug: "action", name: "action" },
        ]);
    });

    it("has nothing to show for a game with no details", () => {
        const bare = facts({
            releaseDate: null,
            platforms: [],
            genres: [],
            developers: [],
            publishers: [],
        });
        expect(hasFacts(bare)).toBe(false);
        expect(hasFacts(facts())).toBe(true);
    });

    it("prints the age rating in words", () => {
        expect(facts({ esrbRating: "Everyone 10+" }).rated).toBe(
            "Everyone 10+"
        );
    });
});

describe("credits", () => {
    it("drops a publisher that only repeats the developer", () => {
        expect(facts().publishers).toEqual([]);
    });

    it("keeps a publisher that is someone else", () => {
        expect(
            facts({
                developers: ["FromSoftware"],
                publishers: ["Bandai Namco"],
            }).publishers
        ).toEqual(["Bandai Namco"]);
    });

    it("shows a website by host, not by its whole url", () => {
        expect(
            facts({ website: "https://www.hollowknight.com/some/path" }).website
        ).toEqual({
            href: "https://www.hollowknight.com/some/path",
            label: "hollowknight.com",
        });
    });

    it("falls back to the raw value when a website will not parse", () => {
        expect(facts({ website: "not a url" }).website?.label).toBe(
            "not a url"
        );
    });
});
