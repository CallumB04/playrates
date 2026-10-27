import { describe, expect, it } from "vitest";
import { willShowPicture } from "./avatarChoice";

const picked = {
    kind: "picked" as const,
    image: new Blob(),
    preview: "blob:x",
};

describe("willShowPicture", () => {
    it("keeps the picture a profile already has", () => {
        expect(
            willShowPicture("https://cdn/a.webp", { kind: "unchanged" })
        ).toBe(true);
    });

    it("shows a picture just picked, with or without one before", () => {
        expect(willShowPicture(null, picked)).toBe(true);
        expect(willShowPicture("https://cdn/a.webp", picked)).toBe(true);
    });

    it("shows the initial once a picture is removed, or where there was none", () => {
        expect(willShowPicture("https://cdn/a.webp", { kind: "removed" })).toBe(
            false
        );
        expect(willShowPicture(null, { kind: "unchanged" })).toBe(false);
    });
});
