import { describe, expect, it } from "vitest";
import { capitalise, formatRating, releaseYear } from "./format";
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
    it("renders a rating as given, including zero", () => {
        expect(formatRating(8.25)).toBe("8.25");
        expect(formatRating(0)).toBe("0");
    });

    it('renders "?" when there is no rating', () => {
        expect(formatRating(null)).toBe("?");
        expect(formatRating(undefined)).toBe("?");
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
