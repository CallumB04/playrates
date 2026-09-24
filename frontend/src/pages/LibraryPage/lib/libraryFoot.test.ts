import { describe, expect, it } from "vitest";
import { GAME_SORTS, type Game } from "@playrates/shared";
import { libraryFoot } from "./libraryFoot";

const game = (overrides: Partial<Game> = {}): Game =>
    ({
        id: 1,
        title: "Portal",
        releaseDate: "2007-10-09",
        logCount: 1284,
        avgRating: 9.25,
        metacritic: 90,
        ...overrides,
    }) as Game;

describe("libraryFoot", () => {
    it("counts the logs when that is the order", () => {
        expect(libraryFoot(game(), "logged").value).toBe("1,284");
    });

    it("shows the site's average, not the viewer's own rating", () => {
        expect(libraryFoot(game(), "rating", { rating: 4 })).toEqual({
            rating: 9.25,
        });
    });

    it("shows the metacritic score", () => {
        expect(libraryFoot(game(), "metacritic").value).toBe("90");
    });

    it("shows a dash for a game metacritic never scored", () => {
        expect(libraryFoot(game({ metacritic: null }), "metacritic").value).toBe(
            "—"
        );
    });

    it("shows a year for release date", () => {
        expect(libraryFoot(game(), "released").value).toBe("2007");
    });

    /* Title has nothing of its own to print, so the tile keeps what it rests
       on: your own rating where you have logged it, the year otherwise. */
    it("keeps the viewer's rating under a title sort", () => {
        expect(libraryFoot(game(), "title", { rating: 8 })).toEqual({
            rating: 8,
        });
    });

    it("falls back to the year when the viewer has not logged it", () => {
        expect(libraryFoot(game(), "title").value).toBe("2007");
    });

    it("gives every sort the library offers something to print", () => {
        for (const sort of GAME_SORTS) {
            const foot = libraryFoot(game(), sort);
            expect(
                foot.value !== undefined || foot.rating !== undefined,
                sort
            ).toBe(true);
        }
    });
});
