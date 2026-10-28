import { describe, expect, it } from "vitest";
import { badgeDef, type BadgeDef } from "@playrates/shared";
import { badgeText, nextTier, rarityText } from "./badgeText";

const critic = badgeDef("critic") as BadgeDef;

describe("badgeText", () => {
    it("fills in the metal's threshold", () => {
        expect(badgeText(critic, 2)).toBe("Write 10 reviews");
    });

    it("keeps a word singular when the threshold is 1", () => {
        expect(badgeText(critic, 1)).toBe("Write 1 review");
    });
});

describe("nextTier", () => {
    it("is the first metal above the one held, or none at the top", () => {
        expect(nextTier(critic, null)?.metal).toBe(1);
        expect(nextTier(critic, 2)?.metal).toBe(3);
        expect(nextTier(critic, 4)).toBeNull();
    });
});

describe("rarityText", () => {
    it("says a share of members, under one per cent as such", () => {
        expect(rarityText(0.123)).toBe("12% of members");
        expect(rarityText(0.004)).toBe("<1% of members");
        expect(rarityText(1)).toBe("Everyone has this");
    });
});
