import { describe, expect, it } from "vitest";
import type { WishlistEntry } from "@playrates/shared";
import {
    buildShelfEntry,
    buildGameLog,
    buildGame,
} from "../../../test/msw/handlers";
import { moveTo, sortWishlist } from "./wishlist";

describe("moveTo", () => {
    const order = [1, 2, 3, 4];

    it("moves a game to a place counted from 1", () => {
        expect(moveTo(order, 4, 1)).toEqual([4, 1, 2, 3]);
        expect(moveTo(order, 1, 3)).toEqual([2, 3, 1, 4]);
    });

    it("holds a place past either end to the end", () => {
        expect(moveTo(order, 2, 0)).toEqual([2, 1, 3, 4]);
        expect(moveTo(order, 2, 99)).toEqual([1, 3, 4, 2]);
    });

    it("leaves the order alone for its own place, or a game not in it", () => {
        expect(moveTo(order, 3, 3)).toBe(order);
        expect(moveTo(order, 9, 1)).toBe(order);
    });
});

describe("sortWishlist", () => {
    const entry = (
        id: number,
        title: string,
        releaseDate: string | null,
        createdAt: string
    ): WishlistEntry => ({
        ...buildShelfEntry([
            buildGameLog({
                id,
                gameId: id,
                status: "wishlist",
                createdAt,
                game: buildGame({ id, title, releaseDate }),
            }),
        ]),
        rank: id,
        consoles: [null],
    });
    const list = [
        entry(1, "Celeste", "2018-01-25", "2026-03-01T00:00:00Z"),
        entry(2, "Hades", null, "2026-05-01T00:00:00Z"),
        entry(3, "Animal Well", "2024-05-09", "2026-01-01T00:00:00Z"),
    ];
    const ids = (entries: WishlistEntry[]) => entries.map((e) => e.gameId);

    it("keeps its owner's order", () => {
        expect(sortWishlist(list, "rank")).toBe(list);
    });

    it("puts the newest first, and a game with no date last", () => {
        expect(ids(sortWishlist(list, "added"))).toEqual([2, 1, 3]);
        expect(ids(sortWishlist(list, "released"))).toEqual([3, 1, 2]);
    });

    it("sorts by title, each keeping its rank", () => {
        const sorted = sortWishlist(list, "title");
        expect(ids(sorted)).toEqual([3, 1, 2]);
        expect(sorted.map((e) => e.rank)).toEqual([3, 1, 2]);
    });
});
