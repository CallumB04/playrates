import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    AVATAR_MAX_BYTES,
    AVATAR_MIME,
    AVATAR_PIXELS,
    AVATAR_SOURCE_MAX_BYTES,
} from "@playrates/shared";
import {
    centreCrop,
    compressAvatar,
    rejectReason,
    targetPixels,
} from "./avatarImage";

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

/* jsdom has no image decoder and no canvas, so the two browser calls the
   compressor leans on are stood up here. Everything between them — the crop,
   the target size, the quality backoff and the cleanup — is the real thing. */
describe("compressAvatar", () => {
    const close = vi.fn();
    let drawn: unknown[][];
    let encodes: { type: string; quality: number }[];
    let context: Record<string, unknown> | null;
    /** Bytes the encoder pretends to produce, per quality step. */
    let sizeFor: (quality: number) => number;
    let bitmapFor: () => { width: number; height: number; close: () => void };

    beforeEach(() => {
        drawn = [];
        encodes = [];
        sizeFor = () => 1_000;
        bitmapFor = () => ({ width: 1000, height: 400, close });
        context = {
            drawImage: (...args: unknown[]) => drawn.push(args),
            imageSmoothingEnabled: false,
            imageSmoothingQuality: "low",
        };

        vi.stubGlobal(
            "createImageBitmap",
            vi.fn(async () => bitmapFor())
        );
        vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
            () => context as unknown as CanvasRenderingContext2D
        );
        vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
            function (this: HTMLCanvasElement, cb, type, quality) {
                encodes.push({ type: type!, quality: quality as number });
                const size = sizeFor(quality as number);
                cb(size < 0 ? null : new Blob([new Uint8Array(size)], { type }));
            }
        );
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
        close.mockClear();
    });

    const png = () => file("image/png", 3_000_000);

    it("encodes the centre square at the stored size, as WebP", async () => {
        const blob = await compressAvatar(png());

        expect(blob.type).toBe(AVATAR_MIME);
        expect(encodes[0]?.type).toBe(AVATAR_MIME);
        // source rect is the centred 400px square, drawn into 320x320
        expect(drawn[0]?.slice(1)).toEqual([
            300, 0, 400, 400, 0, 0, AVATAR_PIXELS, AVATAR_PIXELS,
        ]);
    });

    it("never draws a small picture larger than it came", async () => {
        bitmapFor = () => ({ width: 96, height: 96, close });

        await compressAvatar(png());

        expect(drawn[0]?.slice(5)).toEqual([0, 0, 96, 96]);
    });

    it("stops at the first quality that fits under the cap", async () => {
        sizeFor = (q) => (q > 0.6 ? AVATAR_MAX_BYTES + 1 : 1_000);

        const blob = await compressAvatar(png());

        expect(encodes.map((e) => e.quality)).toEqual([0.82, 0.7, 0.55]);
        expect(blob.size).toBeLessThanOrEqual(AVATAR_MAX_BYTES);
    });

    it("gives up when even the lowest quality is too big", async () => {
        sizeFor = () => AVATAR_MAX_BYTES + 1;

        await expect(compressAvatar(png())).rejects.toThrow(/another/i);
    });

    it("turns away an unusable file without decoding it", async () => {
        await expect(compressAvatar(file("application/pdf", 10))).rejects.toThrow(
            /image/i
        );
        expect(createImageBitmap).not.toHaveBeenCalled();
    });

    it("says so when the canvas gives back no context", async () => {
        context = null;
        await expect(compressAvatar(png())).rejects.toThrow(/could not read/i);
    });

    it("says so when the encoder produces nothing", async () => {
        sizeFor = () => -1;
        await expect(compressAvatar(png())).rejects.toThrow(/encoding failed/i);
    });

    /* The bitmap holds decoded pixels; leaking one per failed attempt would
       be a leak per retry. */
    it("releases the bitmap whether it succeeds or fails", async () => {
        await compressAvatar(png());
        expect(close).toHaveBeenCalledOnce();

        close.mockClear();
        sizeFor = () => AVATAR_MAX_BYTES + 1;
        await expect(compressAvatar(png())).rejects.toThrow();
        expect(close).toHaveBeenCalledOnce();
    });
});
