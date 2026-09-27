import { describe, expect, it } from "vitest";
import { bucketLabel, share } from "./adminFormat";

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
        expect(share(0, 0)).toBe("—");
    });
});
