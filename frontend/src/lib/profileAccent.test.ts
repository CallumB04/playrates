import { describe, expect, it } from "vitest";
import { FALLBACK_ACCENT, PROFILE_ACCENTS } from "@playrates/shared";
import { accentHue, avatarGradient, bannerGradient } from "./profileAccent";

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

describe("gradients", () => {
    it("draws the avatar and the banner from the one hue", () => {
        expect(avatarGradient(200)).toContain("hsl(200");
        expect(bannerGradient(200)).toContain("hsl(200");
    });

    /* 350 + 45 is 395, which is not a hue. */
    it("wraps the second stop round the wheel", () => {
        expect(avatarGradient(350)).toContain("hsl(35 ");
        expect(bannerGradient(350)).toContain("hsl(30 ");
    });

    /* Running out to transparent left the right-hand half reading as an
       unpainted rectangle. Every stop keeps some colour in it. */
    it("never lets the banner fade out to nothing", () => {
        const banner = bannerGradient(200);
        expect(banner).not.toContain("transparent");
        for (const [, alpha] of banner.matchAll(/\/ (0\.\d+)\)/g)) {
            expect(Number(alpha)).toBeGreaterThan(0.2);
        }
    });

    it("keeps the banner softer than the avatar it sits behind", () => {
        expect(bannerGradient(200)).toMatch(/\/ 0\.\d+/);
        expect(avatarGradient(200)).not.toMatch(/\/ 0\.\d+/);
    });
});
