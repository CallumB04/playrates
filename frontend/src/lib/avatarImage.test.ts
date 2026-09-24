import { describe, expect, it } from "vitest";
import { AVATAR_PIXELS, AVATAR_SOURCE_MAX_BYTES } from "@playrates/shared";
import { centreCrop, rejectReason, targetPixels } from "./avatarImage";

const file = (type: string, size: number): File =>
    ({ type, size, name: "picture" }) as File;

describe("centreCrop", () => {
    it("takes the middle of a landscape photo", () => {
        expect(centreCrop(1000, 400)).toEqual({ sx: 300, sy: 0, size: 400 });
    });

    it("takes the middle of a portrait photo", () => {
        expect(centreCrop(400, 1000)).toEqual({ sx: 0, sy: 300, size: 400 });
    });

    it("leaves a square alone", () => {
        expect(centreCrop(512, 512)).toEqual({ sx: 0, sy: 0, size: 512 });
    });

    /* An odd overhang halves to a fraction. drawImage takes it, and rounding
       here would shift the crop off centre by half a pixel. */
    it("keeps a half pixel rather than shifting the crop", () => {
        expect(centreCrop(101, 100)).toEqual({ sx: 0.5, sy: 0, size: 100 });
    });
});

describe("targetPixels", () => {
    it("draws a big photo down to the stored size", () => {
        expect(targetPixels(4000)).toBe(AVATAR_PIXELS);
    });

    /* Upscaling a small picture would cost bytes and add nothing: the browser
       would be inventing the pixels. */
    it("never blows a small picture up", () => {
        expect(targetPixels(96)).toBe(96);
    });
});

describe("rejectReason", () => {
    it("takes what a phone or a screenshot produces", () => {
        for (const type of ["image/jpeg", "image/png", "image/webp", "image/heic"]) {
            expect(rejectReason(file(type, 2_000_000))).toBeNull();
        }
    });

    it("turns away something that is not an image", () => {
        expect(rejectReason(file("application/pdf", 1000))).toMatch(/image/i);
    });

    it("turns away an image past the source limit", () => {
        expect(
            rejectReason(file("image/jpeg", AVATAR_SOURCE_MAX_BYTES + 1))
        ).toMatch(/20MB/);
    });
});
