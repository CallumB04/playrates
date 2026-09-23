import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Game, Genre, Platform } from "@playrates/shared";
import { buildGameFacts, type Fact } from "./gameFacts";

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

const labels = (facts: { label: string }[]) => facts.map((f) => f.label);
const valueOf = (facts: Fact[], label: string) =>
    facts.find((f) => f.label === label)?.value;

/** Some values are elements, so read them the way the page does. */
const renderValue = (facts: Fact[], label: string) =>
    render(<>{valueOf(facts, label)}</>).container.textContent;

describe("buildGameFacts", () => {
    it("lists the rows in order", () => {
        expect(labels(buildGameFacts(game(), PLATFORMS, GENRES))).toEqual([
            "Released",
            "Platforms",
            "Developer",
            "Genres",
        ]);
    });

    it("formats the release date", () => {
        const facts = buildGameFacts(game(), PLATFORMS, GENRES);
        expect(valueOf(facts, "Released")).toBe("24 Feb 2017");
    });

    it("drops a row rather than printing a dash for it", () => {
        const bare = game({
            releaseDate: null,
            platforms: [],
            genres: [],
            developers: [],
            publishers: [],
        });
        expect(buildGameFacts(bare, PLATFORMS, GENRES)).toEqual([]);
    });

    it("drops only the rows with nothing behind them", () => {
        const noGenres = game({ genres: [] });
        expect(labels(buildGameFacts(noGenres, PLATFORMS, GENRES))).toEqual([
            "Released",
            "Platforms",
            "Developer",
        ]);
    });

    it("joins several genre names", () => {
        const both = game({ genres: ["action", "indie"] });
        const facts = buildGameFacts(both, PLATFORMS, GENRES);
        expect(renderValue(facts, "Genres")).toContain("Action · Indie");
    });

    it("falls back to the slug when a genre is not in the lookup", () => {
        const unknown = game({ genres: ["action", "roguelike"] });
        const facts = buildGameFacts(unknown, PLATFORMS, GENRES);
        expect(renderValue(facts, "Genres")).toContain("Action · roguelike");
    });

    it("still lists genres when the lookup has not loaded", () => {
        const facts = buildGameFacts(game(), PLATFORMS, []);
        expect(renderValue(facts, "Genres")).toContain("action");
    });
});

describe("credits", () => {
    const creditLabels = (overrides: Partial<Game>) =>
        labels(buildGameFacts(game(overrides), PLATFORMS, GENRES));

    /* Most self-published games list the same name twice, and a row that
       repeats the one above it is noise. */
    it("drops a publisher that only repeats the developer", () => {
        expect(
            creditLabels({
                developers: ["Team Cherry"],
                publishers: ["Team Cherry"],
            })
        ).not.toContain("Publisher");
    });

    it("keeps a publisher that is someone else", () => {
        expect(
            creditLabels({
                developers: ["FromSoftware"],
                publishers: ["Bandai Namco"],
            })
        ).toContain("Publisher");
    });

    it("pluralises a label with more than one name behind it", () => {
        const many = creditLabels({
            developers: ["Valve", "Hidden Path"],
            publishers: [],
        });
        expect(many).toContain("Developers");
        expect(many).not.toContain("Developer");
    });

    it("names both studios when a game has two", () => {
        const facts = buildGameFacts(
            game({ developers: ["Valve", "Hidden Path"] }),
            PLATFORMS,
            GENRES
        );
        expect(renderValue(facts, "Developers")).toContain(
            "Valve · Hidden Path"
        );
    });

    it("shows a website by host, not by its whole url", () => {
        const facts = buildGameFacts(
            game({ website: "https://www.hollowknight.com/some/path" }),
            PLATFORMS,
            GENRES
        );
        expect(renderValue(facts, "Website")).toBe("hollowknight.com");
    });

    it("opens a website away from the page, without handing it the opener", () => {
        const facts = buildGameFacts(
            game({ website: "https://hollowknight.com" }),
            PLATFORMS,
            GENRES
        );
        render(<>{valueOf(facts, "Website")}</>);
        const link = screen.getByRole("link");
        expect(link).toHaveAttribute("target", "_blank");
        expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("falls back to the raw value when a website will not parse", () => {
        const facts = buildGameFacts(
            game({ website: "not a url" }),
            PLATFORMS,
            GENRES
        );
        expect(renderValue(facts, "Website")).toBe("not a url");
    });

    it("prints the age rating as RAWG words it", () => {
        const facts = buildGameFacts(
            game({ esrbRating: "Everyone 10+" }),
            PLATFORMS,
            GENRES
        );
        expect(valueOf(facts, "Rated")).toBe("Everyone 10+");
    });
});

describe("the genre row", () => {
    const withGenres = (slugs: string[]) =>
        buildGameFacts(game({ genres: slugs }), PLATFORMS, GENRES).find(
            (f) => f.label === "Genres"
        )!.value;

    it("offers no expander for a single genre", () => {
        render(<>{withGenres(["action"])}</>);
        expect(screen.queryByRole("button")).toBeNull();
    });

    it("starts clamped to one line and expands on the chevron", async () => {
        render(<>{withGenres(["action", "indie"])}</>);

        const toggle = screen.getByRole("button", { name: /show all/i });
        expect(toggle).toHaveAttribute("aria-expanded", "false");

        await userEvent.click(toggle);
        expect(
            screen.getByRole("button", { name: /show fewer/i })
        ).toHaveAttribute("aria-expanded", "true");
    });
});
