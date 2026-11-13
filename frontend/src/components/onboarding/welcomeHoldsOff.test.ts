import { describe, expect, it } from "vitest";
import { welcomeHoldsOff } from "./welcomeHoldsOff";

describe("welcomeHoldsOff", () => {
    it("leaves the join pages and the legal pages alone", () => {
        for (const path of [
            "/join",
            "/join/confirmed",
            "/login",
            "/terms",
            "/privacy",
        ])
            expect(welcomeHoldsOff(path)).toBe(true);
    });

    it("opens anywhere else", () => {
        for (const path of ["/", "/library", "/game/12", "/joinery"])
            expect(welcomeHoldsOff(path)).toBe(false);
    });
});
