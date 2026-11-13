import { describe, expect, it } from "vitest";
import {
    filled,
    nextEmpty,
    placeIn,
    swapSlots,
    toSlots,
} from "./favouriteSlots";

const a = { id: 1 };
const b = { id: 2 };
const c = { id: 3 };

describe("favourite slots", () => {
    it("lays a list into six places, the rest empty", () => {
        expect(toSlots([a, b], 4)).toEqual([a, b, null, null]);
    });

    it("trades two places, or moves a game into an empty one", () => {
        expect(swapSlots([a, b, null], 0, 1)).toEqual([b, a, null]);
        expect(swapSlots([a, b, null], 0, 2)).toEqual([null, b, a]);
    });

    it("puts a game in a place, out of wherever it was", () => {
        expect(placeIn([a, b, null], 2, a)).toEqual([null, b, a]);
        expect(placeIn([a, b, null], 1, c)).toEqual([a, c, null]);
    });

    it("finds the next empty place, coming round, or stays where it is", () => {
        expect(nextEmpty([a, null, b, null], 1)).toBe(3);
        expect(nextEmpty([null, a, b], 2)).toBe(0);
        expect(nextEmpty([a, b], 0)).toBe(0);
    });

    it("saves the games in order, gaps closed up", () => {
        expect(filled([null, a, null, b])).toEqual([a, b]);
    });
});
