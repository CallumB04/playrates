import { describe, expect, it } from "vitest";
import type { Game, Genre, Platform } from "@playrates/shared";
import { buildGameFacts } from "./gameFacts";

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
        ...overrides,
    }) as Game;

const labels = (facts: { label: string }[]) => facts.map((f) => f.label);
const valueOf = (facts: { label: string; value: unknown }[], label: string) =>
    facts.find((f) => f.label === label)?.value;

describe("buildGameFacts", () => {
    it("lists release, platforms and genres in order", () => {
        expect(labels(buildGameFacts(game(), PLATFORMS, GENRES))).toEqual([
            "Released",
            "Platforms",
            "Genres",
        ]);
    });

    it("formats the release date", () => {
        const facts = buildGameFacts(game(), PLATFORMS, GENRES);
        expect(valueOf(facts, "Released")).toBe("24 Feb 2017");
    });

    it("drops a row rather than printing a dash for it", () => {
        const bare = game({ releaseDate: null, platforms: [], genres: [] });
        expect(buildGameFacts(bare, PLATFORMS, GENRES)).toEqual([]);
    });

    it("drops only the rows with nothing behind them", () => {
        const noGenres = game({ genres: [] });
        expect(labels(buildGameFacts(noGenres, PLATFORMS, GENRES))).toEqual([
            "Released",
            "Platforms",
        ]);
    });

    it("joins several genre names", () => {
        const both = game({ genres: ["action", "indie"] });
        const facts = buildGameFacts(both, PLATFORMS, GENRES);
        expect(valueOf(facts, "Genres")).toBe("Action · Indie");
    });

    it("falls back to the slug when a genre is not in the lookup", () => {
        const unknown = game({ genres: ["action", "roguelike"] });
        const facts = buildGameFacts(unknown, PLATFORMS, GENRES);
        expect(valueOf(facts, "Genres")).toBe("Action · roguelike");
    });

    it("still lists genres when the lookup has not loaded", () => {
        const facts = buildGameFacts(game(), PLATFORMS, []);
        expect(valueOf(facts, "Genres")).toBe("action");
    });
});
