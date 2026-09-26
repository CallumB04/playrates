import { describe, expect, it } from "vitest";
import {
    bucketLabel,
    changeDirection,
    compactNumber,
    formatChange,
    share,
} from "./adminFormat";

describe("bucketLabel", () => {
    it("reads the date as the UTC day it is, not the viewer's", () => {
        expect(bucketLabel("2026-09-01", "day")).toBe("1 Sep");
    });

    it("says a weekly bucket is the week commencing", () => {
        expect(bucketLabel("2026-09-21", "week")).toBe("w/c 21 Sep");
    });
});

describe("formatChange", () => {
    it("signs the change, with a true minus", () => {
        expect(formatChange({ current: 15, previous: 10, change: 0.5 })).toBe("+50%");
        expect(formatChange({ current: 8, previous: 10, change: -0.2 })).toBe(
            "−20%"
        );
    });

    it("calls growth from nothing new, since it has no percentage", () => {
        const figure = { current: 3, previous: 0, change: null };
        expect(changeDirection(figure)).toBe("new");
        expect(formatChange(figure)).toBe("New");
    });

    it("rounds a hair's breadth to no change", () => {
        expect(formatChange({ current: 1000, previous: 1001, change: -0.001 })).toBe(
            "No change"
        );
    });
});

describe("compactNumber", () => {
    it("shortens the big ones, en-GB style, and leaves the small alone", () => {
        expect(compactNumber(950)).toBe("950");
        expect(compactNumber(12_900)).toBe("12.9k");
    });
});

describe("share", () => {
    it("is a whole percentage, and a dash with nothing to divide", () => {
        expect(share(1, 3)).toBe("33%");
        expect(share(0, 0)).toBe("—");
    });
});
