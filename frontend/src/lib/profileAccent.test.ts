import { describe, expect, it } from "vitest";
import { PROFILE_ACCENTS } from "@playrates/shared";
import {
    avatarGradient,
    bannerGradient,
    hueFor,
    profileHue,
} from "./profileAccent";

describe("hueFor", () => {
    it("gives the same username the same hue every time", () => {
        expect(hueFor("ada")).toBe(hueFor("ada"));
    });

    it("separates anagrams, which a sum of characters would not", () => {
        expect(hueFor("listen")).not.toBe(hueFor("silent"));
        expect(hueFor("ab")).not.toBe(hueFor("ba"));
    });

    it("always lands on the colour wheel", () => {
        for (const name of ["a", "zzzzzzzzzzzz", "user_1", "Ada", ""]) {
            const hue = hueFor(name);
            expect(hue).toBeGreaterThanOrEqual(0);
            expect(hue).toBeLessThan(360);
        }
    });
});

describe("profileHue", () => {
    /* The whole point of the default: a profile that never chose keeps the
       colour it has always had. */
    it("falls back to the username when nothing is chosen", () => {
        expect(profileHue("ada", null)).toBe(hueFor("ada"));
        expect(profileHue("ada", undefined)).toBe(hueFor("ada"));
    });

    it("takes the chosen colour over the username's", () => {
        for (const accent of PROFILE_ACCENTS) {
            expect(profileHue("ada", accent.slug)).toBe(accent.hue);
        }
    });

    /* A slug that is not ours can only come from a row written before this
       list, or after it changed. It should not leave a profile colourless. */
    it("falls back rather than break on a colour it does not know", () => {
        expect(
            profileHue("ada", "chartreuse" as never)
        ).toBe(hueFor("ada"));
    });

    it("gives two different people different colours", () => {
        expect(profileHue("ada", null)).not.toBe(profileHue("grace", null));
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
        expect(bannerGradient(350)).toContain("hsl(35 ");
    });

    it("keeps the banner faint enough to sit behind a name", () => {
        expect(bannerGradient(200)).toContain("transparent");
        expect(bannerGradient(200)).toMatch(/\/ 0\.\d+/);
    });
});
