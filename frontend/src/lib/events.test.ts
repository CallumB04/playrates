import { afterEach, describe, expect, it } from "vitest";
import type {
    AwardCategory,
    AwardNominee,
    EventDetail,
    Game,
} from "@playrates/shared";
import { setDisplayTimeZone } from "./format";
import {
    awaitingNominees,
    awardsLine,
    categoryAnchor,
    countdownParts,
    eventAction,
    mostHyped,
    withHype,
    groupCategories,
    headlineOf,
    loggedOf,
    nomineeGameIds,
    pickedCount,
    pickShare,
    picksWith,
    score,
    showsShares,
    tierNames,
    withPick,
} from "./events";

afterEach(() => setDisplayTimeZone("UTC"));

const nominee = (
    id: number,
    extra: Partial<AwardNominee> = {}
): AwardNominee => ({
    id,
    game: { id, title: `Game ${id}` } as Game,
    label: null,
    detail: null,
    imageUrl: null,
    won: false,
    picks: 0,
    ...extra,
});

const category = (
    id: number,
    nominees: AwardNominee[],
    extra: Partial<AwardCategory> = {}
): AwardCategory => ({
    id,
    slug: `c-${id}`,
    name: `Category ${id}`,
    blurb: "",
    section: "",
    headline: false,
    nominees,
    ...extra,
});

const event = (categories: AwardCategory[] | null): EventDetail => ({
    id: 1,
    slug: "tga",
    kind: "awards",
    name: "TGA",
    tagline: "",
    about: "",
    startsAt: "2026-12-11T03:30:00Z",
    endsAt: null,
    timing: "upcoming",
    organiser: "",
    organiserUrl: null,
    watchUrl: null,
    logo: null,
    publishedAt: "2026-11-17T17:00:00Z",
    covers: [],
    artworkUrl: null,
    artworks: [],
    showcase: null,
    awards: categories && {
        phase: "open",
        picksCloseAt: "2026-12-11T03:30:00Z",
        resultsAt: null,
        categoryCount: categories.length,
        nomineeCount: 0,
        categories,
    },
});

describe("eventAction", () => {
    it("asks for picks, then shows them, then the winners", () => {
        expect(eventAction({ awards: { phase: "open" } })).toBe(
            "Make your picks"
        );
        expect(eventAction({ awards: { phase: "locked" } })).toBe(
            "See the picks"
        );
        expect(eventAction({ awards: { phase: "results" } })).toBe(
            "See the winners"
        );
    });

    it("shows a showcase's reveals, and just opens any other kind", () => {
        expect(
            eventAction({ awards: null, showcase: { revealCount: 3 } })
        ).toBe("See every reveal");
        expect(eventAction({ awards: null })).toBe("See the event");
    });
});

describe("awardsLine", () => {
    it("says when picks close, in the viewer's zone", () => {
        setDisplayTimeZone("Europe/London");
        expect(
            awardsLine({ phase: "open", picksCloseAt: "2026-12-11T03:30:00Z" })
        ).toBe("Picks close 11 Dec, 03:30");
    });

    it("says when they've closed, and when the winners are in", () => {
        const at = "2026-12-11T03:30:00Z";
        expect(awardsLine({ phase: "locked", picksCloseAt: at })).toBe(
            "Picks are closed. Winners soon"
        );
        expect(awardsLine({ phase: "results", picksCloseAt: at })).toBe(
            "The winners are in"
        );
    });
});

describe("pickShare and showsShares", () => {
    it("rounds a nominee's share of its category's picks", () => {
        const c = category(1, [
            nominee(1, { picks: 2 }),
            nominee(2, { picks: 1 }),
        ]);
        expect(pickShare(c.nominees[0]!, c)).toBe(67);
        expect(pickShare(c.nominees[1]!, c)).toBe(33);
        expect(pickShare(nominee(3), category(2, [nominee(3)]))).toBe(0);
    });

    it("waits for your own pick while picks are open", () => {
        expect(showsShares("open", false)).toBe(false);
        expect(showsShares("open", true)).toBe(true);
        expect(showsShares("locked", false)).toBe(true);
        expect(showsShares("results", false)).toBe(true);
    });
});

describe("withPick", () => {
    const base = event([
        category(1, [nominee(10, { picks: 3 }), nominee(11, { picks: 1 })]),
        category(2, [nominee(20, { picks: 5 })]),
    ]);

    it("moves one pick from where it was to where it went", () => {
        const moved = withPick(base, { 1: 10 }, 1, 11);
        expect(
            moved.awards!.categories[0]!.nominees.map((n) => n.picks)
        ).toEqual([2, 2]);
        expect(moved.awards!.categories[1]).toBe(base.awards!.categories[1]);
    });

    it("adds a first pick, and takes a cleared one away", () => {
        expect(
            withPick(base, {}, 1, 10).awards!.categories[0]!.nominees[0]!.picks
        ).toBe(4);
        expect(
            withPick(base, { 1: 10 }, 1, null).awards!.categories[0]!
                .nominees[0]!.picks
        ).toBe(2);
    });

    it("leaves an event of another kind alone", () => {
        const other = event(null);
        expect(withPick(other, {}, 1, 10)).toBe(other);
    });
});

describe("picksWith", () => {
    it("sets and clears one category's pick, leaving the rest", () => {
        expect(picksWith({ 1: 10 }, 2, 20)).toEqual({ 1: 10, 2: 20 });
        expect(picksWith({ 1: 10, 2: 20 }, 1, null)).toEqual({ 2: 20 });
    });
});

describe("score and pickedCount", () => {
    it("counts the winners you called, of those decided so far", () => {
        const categories = [
            category(1, [nominee(10, { won: true }), nominee(11)]),
            category(2, [nominee(20), nominee(21, { won: true })]),
            category(3, [nominee(30), nominee(31)]),
        ];
        expect(score(categories, { 1: 10, 2: 20, 3: 30 })).toEqual({
            called: 1,
            decided: 2,
        });
    });

    it("counts the categories you've picked in, leaving out empty ones", () => {
        const categories = [
            category(1, [nominee(10)]),
            category(2, [nominee(20)]),
            category(3, []),
        ];
        expect(pickedCount(categories, { 1: 10 })).toEqual({
            picked: 1,
            total: 2,
        });
    });
});

describe("nominee games", () => {
    const categories = [
        category(1, [nominee(10), nominee(11)], { headline: true }),
        category(2, [
            nominee(10),
            nominee(40, { game: null, label: "A Composer" }),
            nominee(50, { label: "A Mod" }),
        ]),
    ];

    it("lists each game once, and not the named nominees or their games", () => {
        expect(nomineeGameIds(categories)).toEqual([10, 11]);
    });

    it("counts the ones you've logged", () => {
        expect(loggedOf([10, 11], new Set([11, 99]))).toEqual({
            logged: 1,
            total: 2,
        });
    });

    it("finds the headline award, or falls back to the first", () => {
        expect(headlineOf(categories)?.id).toBe(1);
        expect(headlineOf([category(5, []), category(6, [])])?.id).toBe(5);
    });
});

describe("groupCategories", () => {
    it("leads with the headline award, then groups the rest by section in order", () => {
        const groups = groupCategories([
            category(1, [nominee(1)], { section: "Craft" }),
            category(2, [nominee(2)], { headline: true }),
            category(3, [nominee(3)], { section: "Genres" }),
            category(4, [nominee(4)], { section: "Craft" }),
            category(5, [], { section: "Craft" }),
            category(6, [nominee(6)]),
        ]);
        expect(
            groups.map((g) => [
                g.section,
                g.lead,
                g.categories.map((c) => c.id),
            ])
        ).toEqual([
            ["", true, [2]],
            ["Craft", false, [1, 4]],
            ["Genres", false, [3]],
            ["", false, [6]],
        ]);
    });

    it("has nothing to group when there's nothing to pick", () => {
        expect(groupCategories([category(1, [])])).toEqual([]);
    });

    it("names an anchor for each category", () => {
        expect(categoryAnchor({ slug: "best-rpg" })).toBe("award-best-rpg");
    });
});

describe("showcase hype", () => {
    const reveal = (id: number, hype: number) => ({
        id,
        game: null,
        label: `Reveal ${id}`,
        tag: "trailer" as const,
        hype,
    });
    const show = {
        ...event(null),
        kind: "showcase" as const,
        showcase: {
            revealCount: 2,
            reveals: [reveal(1, 2), reveal(2, 0)],
        },
    };

    it("moves a reveal's count with your hype, never below nothing", () => {
        expect(
            withHype(show, 1, true).showcase!.reveals.map((r) => r.hype)
        ).toEqual([3, 0]);
        expect(
            withHype(show, 2, false).showcase!.reveals.map((r) => r.hype)
        ).toEqual([2, 0]);
        expect(withHype(event(null), 1, true)).toEqual(event(null));
    });

    it("ranks the most hyped first, the earlier shown first among equals", () => {
        expect(
            mostHyped([reveal(1, 1), reveal(2, 5), reveal(3, 1)]).map(
                (r) => r.id
            )
        ).toEqual([2, 1, 3]);
    });
});

describe("countdownParts", () => {
    const at = Date.parse("2026-12-01T00:00:00Z");

    it("splits the time left into days, hours, minutes and seconds", () => {
        expect(countdownParts("2026-12-11T03:30:15Z", at)).toEqual({
            days: 10,
            hours: 3,
            minutes: 30,
            seconds: 15,
        });
    });

    it("is nothing once the moment has come", () => {
        expect(countdownParts("2026-12-01T00:00:00Z", at)).toBeNull();
        expect(countdownParts("2026-11-30T00:00:00Z", at)).toBeNull();
    });
});

describe("tierNames", () => {
    const person = (username: string, isYou = false) => ({
        username,
        avatarUrl: null,
        accent: "violet",
        isYou,
    });

    it("names everyone on a short line", () => {
        expect(
            tierNames(
                {
                    called: 5,
                    players: 2,
                    people: [person("amber"), person("bryn")],
                },
                false
            )
        ).toBe("amber and bryn");
    });

    it("names two and counts the rest on a long line", () => {
        expect(
            tierNames(
                {
                    called: 4,
                    players: 9,
                    people: [person("amber"), person("bryn"), person("cas")],
                },
                false
            )
        ).toBe("amber, bryn and 7 others");
    });

    it("puts you first, as You, on your own score", () => {
        expect(
            tierNames(
                {
                    called: 3,
                    players: 14,
                    people: [person("amber"), person("me", true)],
                },
                true
            )
        ).toBe("You, amber and 12 others");
    });

    it("counts a line of private players without naming any", () => {
        expect(
            tierNames(
                { called: 2, players: 3, people: [{ hidden: true }] },
                false
            )
        ).toBe("3 players");
    });
});

describe("awaitingNominees", () => {
    const awards = (
        phase: "open" | "locked" | "results",
        nomineeCount: number
    ) => ({
        phase,
        picksCloseAt: "2026-12-11T03:30:00Z",
        nomineeCount,
    });

    it("holds an open night with no nominees yet as waiting for them", () => {
        expect(awaitingNominees(awards("open", 0))).toBe(true);
        expect(awardsLine(awards("open", 0))).toBe("Nominees coming soon");
        expect(eventAction({ awards: awards("open", 0), showcase: null })).toBe(
            "See the categories"
        );
    });

    it("opens picks once a nominee is in", () => {
        expect(awaitingNominees(awards("open", 1))).toBe(false);
        expect(eventAction({ awards: awards("open", 1), showcase: null })).toBe(
            "Make your picks"
        );
    });

    it("isn't waiting once picks have closed", () => {
        expect(awaitingNominees(awards("locked", 0))).toBe(false);
    });
});

describe("groupCategories with every category", () => {
    it("keeps categories with no nominees when asked to", () => {
        const empty = [
            category(10, [], { headline: true }),
            category(11, [], { section: "Craft" }),
        ];
        expect(groupCategories(empty)).toEqual([]);
        expect(
            groupCategories(empty, { includeEmpty: true }).map((g) => [
                g.section,
                g.categories.length,
            ])
        ).toEqual([
            ["", 1],
            ["Craft", 1],
        ]);
    });
});
