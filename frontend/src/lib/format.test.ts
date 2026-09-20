import { describe, expect, it } from "vitest";
import {
    capitalise,
    formatCount,
    formatFraction,
    formatHours,
    formatRating,
    relativeTime,
    releaseYear,
} from "./format";
import { cn } from "./cn";

describe("capitalise", () => {
    it("uppercases the first character", () => {
        expect(capitalise("finished")).toBe("Finished");
    });

    it("leaves an already-capitalised word alone", () => {
        expect(capitalise("Steam")).toBe("Steam");
    });

    it("handles an empty string", () => {
        expect(capitalise("")).toBe("");
    });
});

describe("releaseYear", () => {
    it("takes the year from an ISO date", () => {
        expect(releaseYear("2015-05-18")).toBe("2015");
    });

    it("falls back for a missing date", () => {
        expect(releaseYear(null)).toBe("—");
        expect(releaseYear(undefined)).toBe("—");
    });
});

describe("formatRating", () => {
    it("always renders two decimals so a column aligns", () => {
        expect(formatRating(8.25)).toBe("8.25");
        expect(formatRating(9)).toBe("9.00");
        expect(formatRating(0)).toBe("0.00");
    });

    it("renders an em dash when there is no rating", () => {
        expect(formatRating(null)).toBe("—");
        expect(formatRating(undefined)).toBe("—");
    });
});

describe("formatHours", () => {
    it("trims a pointless trailing zero", () => {
        expect(formatHours(52)).toBe("52h");
        expect(formatHours(52.5)).toBe("52.5h");
        expect(formatHours(52.04)).toBe("52h");
    });

    it("renders an em dash when unknown", () => {
        expect(formatHours(null)).toBe("—");
    });
});

describe("formatFraction", () => {
    it("renders completed over total", () => {
        expect(formatFraction(46, 52)).toBe("46/52");
        expect(formatFraction(0, 52)).toBe("0/52");
    });

    it("renders an em dash when there is no total to be a fraction of", () => {
        expect(formatFraction(46, null)).toBe("—");
        expect(formatFraction(46, 0)).toBe("—");
        expect(formatFraction(null, 52)).toBe("—");
    });
});

describe("formatCount", () => {
    it("groups thousands", () => {
        expect(formatCount(184662)).toBe("184,662");
        expect(formatCount(0)).toBe("0");
    });
});

describe("relativeTime", () => {
    const now = Date.parse("2026-09-20T12:00:00Z");

    it("counts minutes, hours and days", () => {
        expect(relativeTime("2026-09-20T11:59:30Z", now)).toBe("just now");
        expect(relativeTime("2026-09-20T11:30:00Z", now)).toBe("30m ago");
        expect(relativeTime("2026-09-20T08:00:00Z", now)).toBe("4h ago");
        expect(relativeTime("2026-09-19T08:00:00Z", now)).toBe("yesterday");
        expect(relativeTime("2026-09-15T12:00:00Z", now)).toBe("5 days ago");
    });

    it("falls back to an absolute date past a month", () => {
        expect(relativeTime("2026-02-11T12:00:00Z", now)).toBe("11 Feb 2026");
    });
});

describe("cn", () => {
    it("joins truthy class names", () => {
        expect(cn("a", "b")).toBe("a b");
    });

    it("drops falsy values, so conditionals do not leak 'false' into class", () => {
        expect(cn("a", false, null, undefined, "b")).toBe("a b");
    });
});
