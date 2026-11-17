import { describe, expect, it } from "vitest";
import type { GameEventEntry } from "@playrates/shared";
import {
    andList,
    entryAction,
    entryLines,
    artForEntries,
    otherArt,
    pastSummary,
    splitEntries,
    wonAt,
} from "./gameEvents";

const at = (
    extra: Partial<GameEventEntry> = {},
    timing: GameEventEntry["event"]["timing"] = "upcoming"
): GameEventEntry => ({
    event: {
        slug: "tga",
        kind: "awards",
        name: "TGA",
        startsAt: "2026-12-11T03:30:00Z",
        endsAt: null,
        timing,
        logo: null,
        artworkUrl: null,
        artworks: [],
    },
    awards: null,
    showcase: null,
    ...extra,
});

const awards = (
    nominations: { category: string; won?: boolean }[],
    phase: "open" | "locked" | "results" = "open"
) =>
    at({
        awards: {
            phase,
            nominations: nominations.map((n, i) => ({
                category: n.category,
                headline: i === 0,
                won: n.won ?? false,
            })),
        },
    });

describe("andList", () => {
    it("joins names the way a sentence would", () => {
        expect(andList([])).toBe("");
        expect(andList(["A"])).toBe("A");
        expect(andList(["A", "B", "C"])).toBe("A, B and C");
    });
});

describe("entryLines", () => {
    it("names what a game is up for", () => {
        expect(
            entryLines(
                awards([
                    { category: "Game of the Year" },
                    { category: "Best Score" },
                ])
            )
        ).toEqual(["Nominated for Game of the Year and Best Score"]);
    });

    it("leads with what it won, then what else it was up for", () => {
        expect(
            entryLines(
                awards(
                    [
                        { category: "Game of the Year" },
                        { category: "Best Score", won: true },
                    ],
                    "results"
                )
            )
        ).toEqual(["Won Best Score", "Also nominated for Game of the Year"]);
    });

    it("says how a game was shown at a showcase, and the hype", () => {
        expect(
            entryLines(at({ showcase: { tag: "premiere", hype: 12 } }))
        ).toEqual(["Shown: World premiere", "12 hyped"]);
    });

    it("has nothing to say about an event of no kind it knows", () => {
        expect(entryLines(at())).toEqual([]);
    });
});

describe("wonAt and entryAction", () => {
    it("knows a win from a nomination", () => {
        expect(wonAt(awards([{ category: "A", won: true }], "results"))).toBe(
            true
        );
        expect(wonAt(awards([{ category: "A" }]))).toBe(false);
        expect(wonAt(at({ showcase: { tag: "date", hype: 0 } }))).toBe(false);
    });

    it("asks for a pick, shows the nominees, then the winners", () => {
        expect(entryAction(awards([{ category: "A" }]))).toBe("Make your pick");
        expect(entryAction(awards([{ category: "A" }], "locked"))).toBe(
            "See the nominees"
        );
        expect(entryAction(awards([{ category: "A" }], "results"))).toBe(
            "See all the winners"
        );
        expect(entryAction(at({ showcase: { tag: "date", hype: 0 } }))).toBe(
            "See every reveal"
        );
    });
});

describe("splitEntries", () => {
    it("keeps the events on or to come apart from the ones gone", () => {
        const live = at({}, "live");
        const gone = at({}, "past");
        expect(splitEntries([live, gone])).toEqual({
            ahead: [live],
            past: [gone],
        });
    });
});

describe("otherArt", () => {
    const big = (id: string) =>
        `https://images.igdb.com/igdb/image/upload/t_1080p/${id}.jpg`;
    const small = (id: string) =>
        `https://images.igdb.com/igdb/image/upload/t_screenshot_big/${id}.jpg`;

    it("skips the picture the page already shows, at any size", () => {
        expect(otherArt([small("one"), big("two")], [big("one")])).toBe(
            big("two")
        );
    });

    it("skips more than one in use, and empty places", () => {
        expect(
            otherArt(
                [null, big("one"), big("two"), big("three")],
                [big("one"), small("two")]
            )
        ).toBe(big("three"));
    });

    it("has nothing when every picture is in use", () => {
        expect(otherArt([big("one")], [big("one")])).toBeNull();
        expect(otherArt([], [])).toBeNull();
    });
});

describe("artForEntries", () => {
    const pic = (id: string) =>
        `https://images.igdb.com/igdb/image/upload/t_1080p/${id}.jpg`;
    const entry = (slug: string, artworks: string[]) => {
        const e = at();
        return { ...e, event: { ...e.event, slug, artworks } };
    };

    it("takes the game's next picture, never the page's own, and never one twice", () => {
        const art = artForEntries(
            [entry("one", [pic("a")]), entry("two", [pic("e")])],
            [pic("page"), pic("next")],
            pic("page")
        );
        expect(art.get("one")).toBe(pic("next"));
        expect(art.get("two")).toBe(pic("e"));
    });

    it("has none for a card with nothing else to show", () => {
        expect(
            artForEntries([entry("one", [pic("page")])], [], pic("page")).get(
                "one"
            )
        ).toBeNull();
    });
});

describe("pastSummary", () => {
    it("heads a win with what it won", () => {
        expect(
            pastSummary(
                awards(
                    [
                        { category: "Game of the Year", won: true },
                        { category: "Best Score", won: true },
                        { category: "Best Narrative" },
                    ],
                    "results"
                )
            )
        ).toEqual({
            title: "Won 2 awards",
            tags: ["Game of the Year", "Best Score"],
            won: true,
        });
        expect(
            pastSummary(
                awards([{ category: "Best Score", won: true }], "results")
            ).title
        ).toBe("Won an award");
    });

    it("heads a nomination with what it was up for", () => {
        expect(pastSummary(awards([{ category: "Best Score" }]))).toEqual({
            title: "Nominated for an award",
            tags: ["Best Score"],
            won: false,
        });
    });

    it("heads a showcase with how it was shown and the hype", () => {
        expect(
            pastSummary(at({ showcase: { tag: "premiere", hype: 12 } }))
        ).toEqual({
            title: "Shown to 12 hyped",
            tags: ["World premiere"],
            won: false,
        });
        expect(pastSummary(at())).toEqual({ title: "", tags: [], won: false });
    });
});
