import { describe, expect, it } from "vitest";
import { GAME_LOG_SORTS } from "@playrates/shared";
import type { GameLogWithGame } from "../../../api";
import { directionLabel, SHELF_SORTS, shelfFoot } from "./shelfSort";

const log = (overrides: Partial<GameLogWithGame> = {}): GameLogWithGame =>
    ({
        id: 1,
        gameId: 2,
        status: "played",
        playedStatus: null,
        rating: 8.5,
        hoursPlayed: null,
        hoursToBeat: null,
        startDate: null,
        finishDate: null,
        platform: null,
        system: null,
        achievementsTotal: null,
        achievementsCompleted: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-09-14T00:00:00.000Z",
        game: {
            id: 2,
            title: "Portal",
            slug: "portal",
            coverUrl: null,
            releaseDate: "2007-10-09",
            platforms: [],
            avgRating: 9.25,
        },
        ...overrides,
    }) as GameLogWithGame;

describe("SHELF_SORTS", () => {
    it("offers every sort the API accepts", () => {
        expect(SHELF_SORTS.map((s) => s.value).sort()).toEqual(
            [...GAME_LOG_SORTS].sort()
        );
    });

    it("words both directions for each, since none of them is 'ascending'", () => {
        for (const option of SHELF_SORTS) {
            expect(option.ascending, option.value).not.toBe("");
            expect(option.descending, option.value).not.toBe(
                option.ascending
            );
        }
    });
});

describe("directionLabel", () => {
    it("words the direction in the sort's own terms", () => {
        expect(directionLabel("title", "asc")).toBe("A to Z");
        expect(directionLabel("rating", "desc")).toBe("Highest first");
        expect(directionLabel("played", "desc")).toBe("Newest first");
    });
});

describe("shelfFoot", () => {
    it("shows your own rating by default", () => {
        expect(shelfFoot(log(), "rating")).toEqual({ rating: 8.5 });
    });

    it("shows the game's average when that is the order", () => {
        expect(shelfFoot(log(), "gameRating")).toEqual({ rating: 9.25 });
    });

    /* "Sept", not "Sep" — en-GB's own abbreviation, and the same one
       formatReleaseShort already prints elsewhere. */
    it("shows a month and year for recently played", () => {
        expect(shelfFoot(log(), "played").value).toBe("Sept 26");
        expect(
            shelfFoot(log({ updatedAt: "2024-03-02T00:00:00.000Z" }), "played")
                .value
        ).toBe("Mar 24");
    });

    it("shows a year alone for release date", () => {
        expect(shelfFoot(log(), "released").value).toBe("2007");
    });

    it("shows completion as a percentage", () => {
        const partly = log({
            achievementsTotal: 24,
            achievementsCompleted: 14,
        });
        expect(shelfFoot(partly, "completion").value).toBe("58%");
    });

    /* No achievements recorded is not nought per cent, and printing 0% would
       claim the opposite of what the log says. */
    it("shows a dash rather than 0% for a game with no achievements", () => {
        expect(shelfFoot(log(), "completion").value).toBe("—");
    });

    it("keeps the rating when sorting by title, which shows itself", () => {
        expect(shelfFoot(log(), "title")).toEqual({ rating: 8.5 });
    });

    it("copes with a log whose game did not come back", () => {
        const orphan = log({ game: null });
        expect(shelfFoot(orphan, "gameRating")).toEqual({ rating: null });
        expect(shelfFoot(orphan, "released").value).toBe("—");
    });

    it("gives every sort something to print", () => {
        for (const sort of GAME_LOG_SORTS) {
            const foot = shelfFoot(log(), sort);
            expect(
                foot.value !== undefined || foot.rating !== undefined,
                sort
            ).toBe(true);
        }
    });
});
