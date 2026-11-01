import { describe, expect, it } from "vitest";
import type { SteamLibraryItem } from "@playrates/shared";
import { importFrom, startingChoices } from "./steamChoices";

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

describe("Steam choices", () => {
    it("start at the suggestion, for games we can add", () => {
        const choices = startingChoices([
            item(1),
            item(2, { suggested: "backlog", hours: 0 }),
            item(3, { logged: true }),
            item(null),
        ]);
        expect([...choices]).toEqual([
            [1, "played"],
            [2, "backlog"],
        ]);
    });

    it("leave out what was skipped, and keep hours for played games", () => {
        const items = [item(1), item(2), item(3, { hours: 0 })];
        const choices = new Map([
            [1, "played" as const],
            [2, "skip" as const],
            [3, "played" as const],
        ]);
        expect(importFrom(items, choices)).toEqual([
            { gameId: 1, status: "played", hours: 3 },
            { gameId: 3, status: "played", hours: null },
        ]);
    });

    it("drop the hours of a game moved to the backlog", () => {
        expect(
            importFrom([item(1)], new Map([[1, "backlog" as const]]))
        ).toEqual([{ gameId: 1, status: "backlog", hours: null }]);
    });
});
