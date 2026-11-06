import { describe, expect, it } from "vitest";
import type { SteamLibraryItem } from "@playrates/shared";
import {
    achievementsToAsk,
    addButtonLabel,
    fillCounts,
    fillFrom,
    fillList,
    fillSummary,
    importFrom,
    importedMessage,
    onePerGame,
    startingDrafts,
    type Achievements,
    type SteamDraft,
} from "./steamChoices";

const item = (
    id: number | null,
    over: Partial<SteamLibraryItem> = {}
): SteamLibraryItem => ({
    appid: id ?? 0,
    name: `Game ${id}`,
    hours: 3,
    game: id === null ? null : { id, title: `Game ${id}`, coverUrl: null },
    logged: false,
    suggested: "played",
    ...over,
});

const draft = (over: Partial<SteamDraft> = {}): SteamDraft => ({
    choice: "played",
    rating: null,
    playedStatus: null,
    ...over,
});

const found = (
    entries: [number, { total: number; unlocked: number } | null][]
): Achievements =>
    new Map(entries.map(([appid, value]) => [appid, { kind: "done", value }]));

describe("Steam drafts", () => {
    it("start at the suggestion, unrated, for games we can add", () => {
        const drafts = startingDrafts([
            item(1),
            item(2, { suggested: "playing" }),
            item(3, { logged: true }),
            item(null),
        ]);
        expect([...drafts]).toEqual([
            [1, draft()],
            [2, draft({ choice: "playing" })],
        ]);
    });

    it("go in with their rating, ending and achievements, skips left out", () => {
        const items = [item(1, { hours: 25 }), item(2), item(3)];
        const drafts = new Map([
            [1, draft({ rating: 8.5, playedStatus: "finished" })],
            [2, draft({ choice: "skip" })],
            [3, draft({ choice: "backlog", playedStatus: "finished" })],
        ]);
        expect(
            importFrom(items, drafts, found([[1, { total: 49, unlocked: 31 }]]))
        ).toEqual([
            {
                gameId: 1,
                status: "played",
                hours: 25,
                rating: 8.5,
                playedStatus: "finished",
                achievementsTotal: 49,
                achievementsCompleted: 31,
            },
            // The backlog has no hours and no ending, whatever was picked.
            {
                gameId: 3,
                status: "backlog",
                hours: null,
                rating: null,
                playedStatus: null,
                achievementsTotal: null,
                achievementsCompleted: null,
            },
        ]);
    });

    it("keep the hours of a game in progress", () => {
        const [game] = importFrom(
            [item(1, { hours: 4 })],
            new Map([[1, draft({ choice: "playing" })]])
        );
        expect(game).toMatchObject({ status: "playing", hours: 4 });
    });
});

describe("one row a game", () => {
    it("keeps a game's first app and drops the rest, leaving unmatched ones", () => {
        const hades = { id: 1, title: "Hades", coverUrl: null };
        expect(
            onePerGame([
                item(1, { appid: 10, game: hades }),
                item(null, { appid: 30 }),
                item(1, { appid: 11, game: hades }),
                item(null, { appid: 31 }),
            ]).map((i) => i.appid)
        ).toEqual([10, 30, 31]);
    });
});

describe("asking Steam for achievements", () => {
    it("asks for the games to add first, then the logged ones to fill", () => {
        expect(
            achievementsToAsk([
                item(1, {
                    logged: true,
                    fills: { platform: true, hours: false, achievements: true },
                }),
                item(2, { achievements: true }),
                item(3, { achievements: false }),
                item(4, { logged: true, fills: null }),
            ])
        ).toEqual([2, 1]);
    });
});

describe("filling the blanks on logged games", () => {
    const logged = (
        id: number,
        fills: SteamLibraryItem["fills"],
        hours = 3
    ): SteamLibraryItem => item(id, { logged: true, fills, hours });

    const items = [
        logged(1, { platform: true, hours: true, achievements: true }, 12),
        logged(2, { platform: false, hours: false, achievements: true }),
        logged(3, null),
        item(4),
    ];

    it("sends what's known now, achievements once they're in", () => {
        expect(
            fillFrom(items, found([[1, { total: 10, unlocked: 4 }]]))
        ).toEqual([
            {
                gameId: 1,
                hours: 12,
                achievementsTotal: 10,
                achievementsCompleted: 4,
            },
        ]);
    });

    it("counts a game whose only blank is achievements once they load", () => {
        const loading: Achievements = new Map([[2, { kind: "loading" }]]);
        expect(fillCounts(items, loading).games).toBe(1);
        expect(
            fillCounts(items, found([[2, { total: 5, unlocked: 5 }]]))
        ).toEqual({ games: 2, platform: 1, hours: 1, achievements: 1 });
        // None to unlock is nothing to fill.
        expect(fillCounts(items, found([[2, null]])).games).toBe(1);
    });

    it("says what it adds, across the games and on each", () => {
        const achieved = found([[1, { total: 10, unlocked: 4 }]]);
        expect(fillSummary(fillCounts(items, achieved))).toBe(
            "Adds Steam as the platform on 1, hours on 1 and achievements on 1"
        );
        expect(
            fillSummary({ games: 2, platform: 2, hours: 0, achievements: 0 })
        ).toBe("Adds Steam as the platform on 2");
        expect(fillList(items, achieved)).toEqual([
            { title: "Game 1", fills: "platform, hours and achievements" },
        ]);
    });
});

describe("the words for an import", () => {
    it("labels the button by what it does", () => {
        expect(addButtonLabel(3, 0)).toBe("Add 3 games");
        expect(addButtonLabel(1, 0)).toBe("Add 1 game");
        expect(addButtonLabel(0, 2)).toBe("Update 2 games");
        expect(addButtonLabel(3, 2)).toBe("Add 3, update 2");
    });

    it("says what went in", () => {
        expect(importedMessage({ added: 3, skipped: 0 })).toBe(
            "Added 3 games to your shelves"
        );
        expect(importedMessage({ added: 0, skipped: 0, updated: 1 })).toBe(
            "Updated 1 game on your shelves"
        );
        expect(importedMessage({ added: 2, skipped: 0, updated: 4 })).toBe(
            "Added 2 games and updated 4 games"
        );
    });
});
