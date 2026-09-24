import { describe, expect, it } from "vitest";
import { DEFAULT_ACCENT, PROFILE_ACCENTS } from "@playrates/shared";
import { accentHue, avatarGradient, bannerGradient } from "./profileAccent";

describe("accentHue", () => {
    it("gives every colour in the palette its own hue", () => {
        for (const accent of PROFILE_ACCENTS) {
            expect(accentHue(accent.slug)).toBe(accent.hue);
        }
        const hues = PROFILE_ACCENTS.map((a) => a.hue);
        expect(new Set(hues).size).toBe(hues.length);
    });

    /* Nothing chosen, a row written before this list, a slug that has since
       been retired: all of them are the brand rather than no colour at all. */
    it("falls back to the brand, never to nothing", () => {
        const brand = accentHue(DEFAULT_ACCENT);
        expect(accentHue(null)).toBe(brand);
        expect(accentHue(undefined)).toBe(brand);
        expect(accentHue("chartreuse")).toBe(brand);
    });

    it("starts every profile on the brand", () => {
        expect(DEFAULT_ACCENT).toBe("playrates");
        expect(PROFILE_ACCENTS[0]?.slug).toBe(DEFAULT_ACCENT);
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
