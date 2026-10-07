import { describe, expect, it } from "vitest";
import { logMilestone } from "./logMilestone";

describe("logMilestone", () => {
    it("marks the first game", () => {
        expect(logMilestone(1)).toBe("Your first game is on your shelves");
    });

    it("marks round numbers", () => {
        expect(logMilestone(10)).toBe("That's 10 games on your shelves");
        expect(logMilestone(250)).toBe("That's 250 games on your shelves");
        expect(logMilestone(2000)).toBe("That's 2,000 games on your shelves");
    });

    it("says nothing special for the rest", () => {
        expect(logMilestone(2)).toBeNull();
        expect(logMilestone(11)).toBeNull();
        expect(logMilestone(1500)).toBeNull();
    });
});
