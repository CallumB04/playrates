import { describe, expect, it } from "vitest";
import {
    capitalise,
    formatCount,
    formatDate,
    formatFraction,
    formatHours,
    formatMonthYear,
    formatPercent,
    formatRating,
    formatRatingOutOfTen,
    formatReleaseShort,
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

describe("formatRatingOutOfTen", () => {
    it("carries the scale with the figure", () => {
        expect(formatRatingOutOfTen(8.25)).toBe("8.25/10");
        expect(formatRatingOutOfTen(10)).toBe("10.00/10");
        expect(formatRatingOutOfTen(0)).toBe("0.00/10");
    });

    it("renders a bare em dash rather than an unrated /10", () => {
        expect(formatRatingOutOfTen(null)).toBe("—");
        expect(formatRatingOutOfTen(undefined)).toBe("—");
    });
});

describe("formatReleaseShort", () => {
    it("gives the day and month", () => {
        expect(formatReleaseShort("2026-03-12")).toBe("12 Mar");
    });

    it("says TBA when there is no date", () => {
        expect(formatReleaseShort(null)).toBe("TBA");
        expect(formatReleaseShort(undefined)).toBe("TBA");
        expect(formatReleaseShort("")).toBe("TBA");
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

    it("renders an em dash when the count is unknown", () => {
        expect(formatCount(null)).toBe("—");
        expect(formatCount(undefined)).toBe("—");
    });
});

describe("formatPercent", () => {
    it("rounds to whole percent", () => {
        expect(formatPercent(0)).toBe("0%");
        expect(formatPercent(0.305)).toBe("31%");
        expect(formatPercent(1)).toBe("100%");
    });
});

describe("formatMonthYear", () => {
    it("spells the month for a member-since line", () => {
        expect(formatMonthYear("2021-07-04T09:00:00Z")).toBe("July 2021");
    });

    it("renders an em dash when there is no date", () => {
        expect(formatMonthYear(null)).toBe("—");
    });
});

describe("formatDate", () => {
    it("renders a short absolute date", () => {
        expect(formatDate("2026-02-11T00:00:00Z")).toBe("11 Feb 2026");
    });

    it("renders an em dash when there is no date", () => {
        expect(formatDate(undefined)).toBe("—");
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

    it("treats the 29-day boundary as relative and the 30th as absolute", () => {
        expect(relativeTime("2026-08-23T12:00:00Z", now)).toBe("28 days ago");
        expect(relativeTime("2026-08-21T12:00:00Z", now)).toBe("21 Aug 2026");
    });

    it("renders an em dash when there is no timestamp", () => {
        expect(relativeTime(null, now)).toBe("—");
    });
});

describe("cn", () => {
    it("joins truthy class names", () => {
        expect(cn("a", "b")).toBe("a b");
    });

    it("drops falsy values, so conditionals do not leak 'false' into class", () => {
        expect(cn("a", false, null, undefined, "b")).toBe("a b");
    });

    it("drops the empty string rather than doubling a space", () => {
        expect(cn("a", "", "b")).toBe("a b");
    });

    it("returns an empty string when nothing survives", () => {
        expect(cn(false, undefined)).toBe("");
    });
});
