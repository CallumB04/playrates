import { describe, expect, it } from "vitest";
import { parseHours } from "./parseHours";

describe("parseHours", () => {
    it.each([
        ["12", 12],
        ["12.5", 12.5],
        ["12,5", 12.5],
        ["12h", 12],
        ["12 hours", 12],
        ["12hrs", 12],
        ["12h30", 12.5],
        ["12h 30m", 12.5],
        ["12 hours 30 minutes", 12.5],
        ["12:30", 12.5],
        ["1:20", 1.33],
        ["90m", 1.5],
        ["90 min", 1.5],
        ["  7  ", 7],
    ])("reads %j as %d hours", (input, hours) => {
        expect(parseHours(input)).toBe(hours);
    });

    it("leaves an empty field empty", () => {
        expect(parseHours("   ")).toBeNull();
    });

    it("says so when it can't read it", () => {
        expect(parseHours("lots")).toBeNaN();
        expect(parseHours("12:75")).toBeNaN();
        expect(parseHours("-3")).toBeNaN();
    });
});
