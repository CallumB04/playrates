import { describe, expect, it } from "vitest";
import { owesWelcome } from "./owesWelcome";

const CHOSEN = "2026-09-25T09:00:00.000Z";

describe("owesWelcome", () => {
    it("greets an account that has never dismissed the welcome", () => {
        expect(
            owesWelcome({ onboardedAt: null, usernameChosenAt: CHOSEN }, false)
        ).toBe(true);
    });

    /* The once in "only the first time they log in". */
    it("does not greet an account that already has", () => {
        expect(
            owesWelcome(
                {
                    onboardedAt: "2026-09-25T10:00:00.000Z",
                    usernameChosenAt: CHOSEN,
                },
                false
            )
        ).toBe(false);
    });

    it("waits for the signup sheet to close", () => {
        expect(
            owesWelcome({ onboardedAt: null, usernameChosenAt: CHOSEN }, true)
        ).toBe(false);
    });

    /* A Google or Discord signup picks a name first; two sheets at once
       would stack on a phone. */
    it("waits for a username to be chosen", () => {
        expect(
            owesWelcome({ onboardedAt: null, usernameChosenAt: null }, false)
        ).toBe(false);
    });

    it("greets nobody who is signed out", () => {
        expect(owesWelcome(null, false)).toBe(false);
    });
});
