import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GAME_SORTS, type Game } from "@playrates/shared";
import { libraryFoot } from "./libraryFoot";

/** The value is an element for some sorts, so read it the way a tile does. */
const shown = (value: React.ReactNode) =>
    render(<>{value}</>).container.firstElementChild;

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
    /* A bare number under a cover reads as a rating or a year. */
    it("counts the logs, and says they are logs", () => {
        expect(libraryFoot(game(), "logged").value).toBe("1,284 logs");
    });

    it("says log, singular, when there is one", () => {
        expect(libraryFoot(game({ logCount: 1 }), "logged").value).toBe(
            "1 log"
        );
    });

    it("shows the site's average, not the viewer's own rating", () => {
        expect(libraryFoot(game(), "rating", { rating: 4 })).toEqual({
            rating: 9.25,
        });
    });

    /* Metacritic's own banding, the same box the game page shows. */
    it("shows the metacritic score in its own colour", () => {
        const green = shown(libraryFoot(game(), "metacritic").value);
        expect(green).toHaveTextContent("90");
        expect(green).toHaveClass("bg-[#66cc33]");

        const yellow = shown(
            libraryFoot(game({ metacritic: 62 }), "metacritic").value
        );
        expect(yellow).toHaveClass("bg-[#ffcc33]");

        const red = shown(
            libraryFoot(game({ metacritic: 30 }), "metacritic").value
        );
        expect(red).toHaveClass("bg-[#ff0000]");
    });

    it("shows an uncoloured dash for a game metacritic never scored", () => {
        const none = shown(
            libraryFoot(game({ metacritic: null }), "metacritic").value
        );
        expect(none).toHaveTextContent("—");
        expect(none).not.toHaveClass("bg-[#ff0000]");
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
