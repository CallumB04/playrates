import { describe, expect, it } from "vitest";
import { popularOfYear } from "./popularOfYear";

describe("popularOfYear", () => {
    it("asks for the year's games, most logged first", () => {
        expect(popularOfYear(2026)).toEqual({
            sort: "logged",
            releasedAfter: "2026-01-01",
            releasedBefore: "2026-12-31",
            page: 1,
            limit: 6,
        });
    });
});
