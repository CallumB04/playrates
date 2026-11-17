import { describe, expect, it } from "vitest";
import {
    announceHref,
    fromLocalInput,
    moved,
    slugify,
    statusLabel,
    toLocalInput,
} from "./eventAdmin";

describe("slugify", () => {
    it("turns a name into an address", () => {
        expect(slugify("The Game Awards 2026")).toBe("the-game-awards-2026");
        expect(slugify("Best Score & Music")).toBe("best-score-and-music");
        expect(slugify("  Pokémon: Legends!  ")).toBe("pokemon-legends");
    });

    it("keeps to eighty characters, with no dash left at the end", () => {
        const slug = slugify(`${"a".repeat(79)} b`);
        expect(slug.length).toBeLessThanOrEqual(80);
        expect(slug.endsWith("-")).toBe(false);
    });
});

describe("local datetime fields", () => {
    it("round-trips a moment through the field", () => {
        const iso = "2026-12-11T03:30:00.000Z";
        expect(fromLocalInput(toLocalInput(iso))).toBe(iso);
    });

    it("has no moment for an empty or broken field", () => {
        expect(fromLocalInput("")).toBeNull();
        expect(fromLocalInput("2026-13-45T99:99")).toBeNull();
    });
});

describe("moved", () => {
    it("swaps an id with its neighbour", () => {
        expect(moved([1, 2, 3], 1, -1)).toEqual([2, 1, 3]);
        expect(moved([1, 2, 3], 1, 1)).toEqual([1, 3, 2]);
    });

    it("leaves the list alone at either end", () => {
        expect(moved([1, 2], 0, -1)).toEqual([1, 2]);
        expect(moved([1, 2], 1, 1)).toEqual([1, 2]);
    });
});

describe("announceHref", () => {
    const read = (href: string) =>
        new URLSearchParams(href.slice(href.indexOf("?") + 1));

    it("announces the nominees, linking to the event", () => {
        const params = read(
            announceHref({
                name: "TGA",
                slug: "tga",
                tagline: "",
                awards: { phase: "open" },
            })
        );
        expect(params.get("title")).toBe("TGA: the nominees are in");
        expect(params.get("link")).toBe("/events/tga");
        expect(params.get("tone")).toBe("celebration");
    });

    it("announces the winners once they're in", () => {
        expect(
            read(
                announceHref({
                    name: "TGA",
                    slug: "tga",
                    tagline: "",
                    awards: { phase: "results" },
                })
            ).get("title")
        ).toBe("TGA: the winners are in");
    });

    it("announces any other kind by its name and tagline", () => {
        const params = read(
            announceHref({
                name: "A Showcase",
                slug: "showcase",
                tagline: "New games, live.",
                awards: null,
            })
        );
        expect(params.get("title")).toBe("A Showcase");
        expect(params.get("body")).toBe("New games, live.");
    });
});

describe("statusLabel", () => {
    const base = { publishedAt: "2026-11-17", timing: "upcoming" as const };

    it("calls an unpublished event a draft", () => {
        expect(statusLabel({ ...base, publishedAt: null, awards: null })).toBe(
            "Draft"
        );
    });

    it("gives an awards night's stage, and any other its time", () => {
        expect(statusLabel({ ...base, awards: { phase: "open" } })).toBe(
            "Picks open"
        );
        expect(statusLabel({ ...base, awards: { phase: "results" } })).toBe(
            "Winners out"
        );
        expect(statusLabel({ ...base, timing: "live", awards: null })).toBe(
            "On now"
        );
    });
});
