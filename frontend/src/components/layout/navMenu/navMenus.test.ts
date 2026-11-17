import { describe, expect, it } from "vitest";
import type { EventSummary } from "@playrates/shared";
import {
    bestOfYears,
    librarySortPath,
    menuEvents,
    slideFrom,
} from "./navMenus";

const event = (
    slug: string,
    startsAt: string,
    endsAt: string | null = null
): EventSummary => ({
    id: slug.length,
    slug,
    kind: "showcase",
    name: slug,
    tagline: "",
    startsAt,
    endsAt,
    timing: "upcoming",
    organiser: "",
    organiserUrl: null,
    watchUrl: null,
    logo: null,
    publishedAt: startsAt,
    covers: [],
    artworkUrl: null,
    artworks: [],
    awards: null,
    showcase: null,
});

describe("slideFrom", () => {
    it("slides a menu further along the bar in from the right", () => {
        expect(slideFrom("library", "events")).toBe("right");
        expect(slideFrom("events", "community")).toBe("left");
    });

    it("doesn't slide a menu opening fresh, or the same one again", () => {
        expect(slideFrom(null, "library")).toBeNull();
        expect(slideFrom("library", "library")).toBeNull();
    });
});

describe("librarySortPath", () => {
    it("leaves the library's own default sort out of the address", () => {
        expect(librarySortPath("logged")).toBe("/library");
        expect(librarySortPath("rating")).toBe("/library?sort=rating");
    });
});

describe("bestOfYears", () => {
    it("offers this year's best and last year's", () => {
        expect(bestOfYears(new Date("2026-11-16T12:00:00Z"))).toEqual([
            2026, 2025,
        ]);
    });
});

describe("menuEvents", () => {
    const now = new Date("2026-11-16T12:00:00Z");

    it("puts what's on first, then what's next soonest, then the latest past", () => {
        const shown = menuEvents(
            [
                event("old", "2025-12-11T03:30:00Z"),
                event("later", "2026-12-20T18:00:00Z"),
                event("older", "2024-12-11T03:30:00Z"),
                event("on", "2026-11-15T12:00:00Z", "2026-11-18T12:00:00Z"),
                event("next", "2026-12-11T03:30:00Z"),
            ],
            now,
            5
        );
        expect(shown.map((e) => e.slug)).toEqual([
            "on",
            "next",
            "later",
            "old",
            "older",
        ]);
    });

    it("keeps to three", () => {
        const shown = menuEvents(
            ["a", "b", "c", "d"].map((slug, i) =>
                event(slug, `2026-12-0${i + 1}T00:00:00Z`)
            ),
            now
        );
        expect(shown).toHaveLength(3);
    });
});
