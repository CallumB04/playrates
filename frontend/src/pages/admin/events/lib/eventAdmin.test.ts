import { describe, expect, it } from "vitest";
import {
    announceHref,
    fromZonedInput,
    moved,
    slugify,
    statusLabel,
    toZonedInput,
    zoneLabel,
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

describe("datetime fields on a chosen zone's clocks", () => {
    it("reads a time typed in Los Angeles as the moment it means", () => {
        expect(fromZonedInput("2026-12-10T16:30", "America/Los_Angeles")).toBe(
            "2026-12-11T00:30:00.000Z"
        );
    });

    it("shows a moment on the zone's clocks, summer time included", () => {
        expect(toZonedInput("2026-12-11T00:30:00.000Z", "Europe/London")).toBe(
            "2026-12-11T00:30"
        );
        expect(toZonedInput("2026-07-01T11:00:00.000Z", "Europe/London")).toBe(
            "2026-07-01T12:00"
        );
        expect(fromZonedInput("2026-07-01T12:00", "Europe/London")).toBe(
            "2026-07-01T11:00:00.000Z"
        );
    });

    it("round-trips a moment through the field in any zone", () => {
        const iso = "2026-12-11T00:30:00.000Z";
        for (const zone of ["Asia/Tokyo", "America/New_York", "UTC"]) {
            expect(fromZonedInput(toZonedInput(iso, zone), zone)).toBe(iso);
        }
    });

    it("has no moment for an empty or broken field", () => {
        expect(fromZonedInput("", "Europe/London")).toBeNull();
        expect(fromZonedInput("2026-12-1", "Europe/London")).toBeNull();
    });

    it("names a zone with its offset at the time", () => {
        expect(
            zoneLabel("America/Los_Angeles", Date.parse("2026-12-10T00:00Z"))
        ).toBe("America/Los Angeles (GMT-8)");
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
                about: "",
                awards: { phase: "open" },
            })
        );
        expect(params.get("title")).toBe("TGA: the nominees are in");
        expect(params.get("link")).toBe("/events/tga");
        expect(params.get("tone")).toBe("event");
    });

    it("announces the winners once they're in", () => {
        expect(
            read(
                announceHref({
                    name: "TGA",
                    slug: "tga",
                    about: "",
                    awards: { phase: "results" },
                })
            ).get("title")
        ).toBe("TGA: the winners are in");
    });

    it("announces any other kind by its name and its About's first paragraph", () => {
        const params = read(
            announceHref({
                name: "A Showcase",
                slug: "showcase",
                about: "New games, live.\n\nWatch along here.",
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
