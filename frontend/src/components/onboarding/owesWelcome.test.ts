import { describe, expect, it } from "vitest";
import { owesWelcome } from "./owesWelcome";

describe("owesWelcome", () => {
    it("greets an account that has never dismissed the welcome", () => {
        expect(owesWelcome({ onboardedAt: null }, false)).toBe(true);
    });

    /* The once in "only the first time they log in". */
    it("does not greet an account that already has", () => {
        expect(
            owesWelcome({ onboardedAt: "2026-09-25T10:00:00.000Z" }, false)
        ).toBe(false);
    });

    it("waits for the signup sheet to close", () => {
        expect(owesWelcome({ onboardedAt: null }, true)).toBe(false);
    });

    it("greets nobody who is signed out", () => {
        expect(owesWelcome(null, false)).toBe(false);
    });
});
