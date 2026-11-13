import { describe, expect, it } from "vitest";
import { returnTo } from "./returnTo";

describe("returnTo", () => {
    it("takes you back to the page you came from", () => {
        expect(returnTo({ from: "/game/42?tab=reviews" })).toBe(
            "/game/42?tab=reviews"
        );
    });

    it("goes home rather than off the site", () => {
        expect(returnTo({ from: "https://evil.example" })).toBe("/");
        expect(returnTo({ from: "//evil.example" })).toBe("/");
    });

    it("goes home with nowhere to go back to, or only the join pages themselves", () => {
        expect(returnTo(null)).toBe("/");
        expect(returnTo({ from: 3 })).toBe("/");
        expect(returnTo({ from: "/join" })).toBe("/");
        expect(returnTo({ from: "/login" })).toBe("/");
    });
});
