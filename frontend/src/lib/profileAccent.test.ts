import { describe, expect, it } from "vitest";
import { FALLBACK_ACCENT, PROFILE_ACCENTS } from "@playrates/shared";
import { accentHue, avatarGradient } from "./profileAccent";

describe("accentHue", () => {
    it("gives every colour in the palette its own hue", () => {
        for (const accent of PROFILE_ACCENTS) {
            expect(accentHue(accent.slug)).toBe(accent.hue);
        }
        const hues = PROFILE_ACCENTS.map((a) => a.hue);
        expect(new Set(hues).size).toBe(hues.length);
    });

    /* Nothing stored, a row written before this list, a slug that has since
       been retired — "playrates" among them: all of them draw something. */
    it("falls back rather than leave a profile colourless", () => {
        const fallback = accentHue(FALLBACK_ACCENT);
        expect(accentHue(null)).toBe(fallback);
        expect(accentHue(undefined)).toBe(fallback);
        expect(accentHue("chartreuse")).toBe(fallback);
        expect(accentHue("playrates")).toBe(fallback);
    });

    /* The brand belongs to PlayRates. A profile wearing it would read as
       official rather than as somebody's choice. */
    it("does not offer the brand as a profile colour", () => {
        expect(PROFILE_ACCENTS.map((a) => a.slug)).not.toContain("playrates");
    });

    it("has a fallback that is one of the colours it offers", () => {
        expect(PROFILE_ACCENTS.map((a) => a.slug)).toContain(FALLBACK_ACCENT);
    });
});

describe("avatarGradient", () => {
    it("draws from the profile's hue", () => {
        expect(avatarGradient(200)).toContain("hsl(200");
    });

    /* 350 + 45 is 395, which is not a hue. */
    it("wraps the second stop round the wheel", () => {
        expect(avatarGradient(350)).toContain("hsl(35 ");
    });
});
