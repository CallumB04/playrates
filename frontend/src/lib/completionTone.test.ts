import { describe, expect, it } from "vitest";
import { completionTier, completionTone } from "./completionTone";

describe("completionTier", () => {
    it.each([
        [0, "low"],
        [0.24, "low"],
        [0.244, "low"],
        [0.246, "mid"],
        [0.25, "mid"],
        [0.74, "mid"],
        [0.75, "high"],
        [0.994, "high"],
        [0.996, "full"],
        [1, "full"],
    ])("puts %s in the %s band", (fraction, tier) => {
        expect(completionTier(fraction)).toBe(tier);
    });

    it("holds anything past the ends to them", () => {
        expect(completionTier(-1)).toBe("low");
        expect(completionTier(3)).toBe("full");
    });
});

describe("completionTone", () => {
    it("gives a figure, a bar and the ring the band's colour", () => {
        expect(completionTone(0.5)).toEqual({
            text: "text-completion-mid-text",
            fill: "bg-completion-mid",
            colour: "var(--completion-mid)",
            sheen: "var(--completion-mid)",
        });
    });

    it("keeps gold, and the bright sweep, for a full set alone", () => {
        expect(completionTone(1)).toMatchObject({
            text: "text-medal-gold",
            sheen: "var(--status-mastered-sheen)",
        });
        expect(completionTone(0.99).text).toBe("text-completion-high-text");
    });
});
