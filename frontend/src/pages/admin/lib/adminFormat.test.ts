import { describe, expect, it } from "vitest";
import { bucketLabel, share, shareLevel } from "./adminFormat";

describe("bucketLabel", () => {
    it("reads the date as the UTC day it is, not the viewer's", () => {
        expect(bucketLabel("2026-09-01", "day")).toBe("1 Sep");
    });

    it("says a weekly bucket is the week commencing", () => {
        expect(bucketLabel("2026-09-21", "week")).toBe("w/c 21 Sep");
    });
});

describe("share", () => {
    it("is a whole percentage, and a dash with nothing to divide", () => {
        expect(share(1, 3)).toBe("33%");
        expect(share(0, 0)).toBe("–");
    });
});

describe("shareLevel", () => {
    it.each([
        [0, 0, 0],
        [0, 10, 0],
        [1, 10, 1],
        [25, 100, 2],
        [1, 2, 3],
        [3, 4, 4],
        [5, 5, 4],
    ])("%i of %i is level %i", (part, whole, level) => {
        expect(shareLevel(part, whole)).toBe(level);
    });
});
