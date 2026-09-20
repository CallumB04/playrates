import { describe, expect, it } from "vitest";
import { toHex } from "./colour";

describe("toHex", () => {
    it("converts the rgb() form browsers actually return", () => {
        expect(toHex("rgb(124, 58, 140)")).toBe("#7c3a8c");
        expect(toHex("rgb(255 255 255)")).toBe("#ffffff");
    });

    it("appends alpha only when there is any", () => {
        expect(toHex("rgba(0, 0, 0, 1)")).toBe("#000000");
        expect(toHex("rgba(80, 60, 35, 0.22)")).toBe("#503c2338");
    });

    it("scales color(srgb …) floats up from 0–1", () => {
        expect(toHex("color(srgb 0.486275 0.227451 0.549020)")).toBe("#7c3a8c");
    });

    it("passes hex straight through", () => {
        expect(toHex("#7C3A8C")).toBe("#7c3a8c");
    });

    it("returns anything unrecognised unchanged rather than dropping it", () => {
        expect(toHex("transparent")).toBe("transparent");
        expect(toHex("oklch(0.7 0.1 300)")).toBe("oklch(0.7 0.1 300)");
    });
});
