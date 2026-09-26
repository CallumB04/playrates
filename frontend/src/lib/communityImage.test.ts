import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    COMMUNITY_IMAGE_MAX_BYTES,
    COMMUNITY_IMAGE_MAX_EDGE,
    COMMUNITY_IMAGE_MIME,
} from "@playrates/shared";
import { compressCommunityImage, fitWithin } from "./communityImage";

const file = (type: string, size: number): File =>
    new File([new Uint8Array(size)], "picture", { type });

describe("fitWithin", () => {
    it("scales the longest edge down to the cap, keeping the shape", () => {
        expect(fitWithin(4000, 3000, 1600)).toEqual({
            width: 1600,
            height: 1200,
        });
        expect(fitWithin(1000, 5000, 1600)).toEqual({
            width: 320,
            height: 1600,
        });
    });

    it("never scales a small picture up", () => {
        expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
    });

    it("keeps a sliver at least a pixel wide", () => {
        expect(fitWithin(10_000, 2, 1600).height).toBe(1);
    });
});

describe("compressCommunityImage", () => {
    const close = vi.fn();
    let drawn: unknown[][];
    let encodes: { type: string; quality: number }[];
    let context: Record<string, unknown> | null;
    let sizeFor: (quality: number) => number;
    let canvases: HTMLCanvasElement[];

    beforeEach(() => {
        drawn = [];
        encodes = [];
        canvases = [];
        sizeFor = () => 1_000;
        context = {
            drawImage: (...args: unknown[]) => drawn.push(args),
            imageSmoothingEnabled: false,
            imageSmoothingQuality: "low",
        };

        vi.stubGlobal(
            "createImageBitmap",
            vi.fn(async () => ({ width: 4000, height: 2000, close }))
        );
        vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
            function (this: HTMLCanvasElement) {
                canvases.push(this);
                return context as unknown as CanvasRenderingContext2D;
            }
        );
        vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
            function (this: HTMLCanvasElement, cb, type, quality) {
                encodes.push({ type: type!, quality: quality as number });
                cb(
                    new Blob([new Uint8Array(sizeFor(quality as number))], {
                        type,
                    })
                );
            }
        );
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
        close.mockClear();
    });

    const jpeg = () => file("image/jpeg", 5_000_000);

    it("draws the whole picture, uncropped, within the edge cap, as WebP", async () => {
        const blob = await compressCommunityImage(jpeg());

        expect(blob.type).toBe(COMMUNITY_IMAGE_MIME);
        expect(encodes[0]?.type).toBe(COMMUNITY_IMAGE_MIME);
        expect(canvases[0]?.width).toBe(COMMUNITY_IMAGE_MAX_EDGE);
        expect(canvases[0]?.height).toBe(COMMUNITY_IMAGE_MAX_EDGE / 2);
        expect(drawn[0]?.slice(1)).toEqual([
            0,
            0,
            COMMUNITY_IMAGE_MAX_EDGE,
            COMMUNITY_IMAGE_MAX_EDGE / 2,
        ]);
    });

    it("gives up when even the lowest quality is too big", async () => {
        sizeFor = () => COMMUNITY_IMAGE_MAX_BYTES + 1;
        await expect(compressCommunityImage(jpeg())).rejects.toThrow(
            /another/i
        );
    });

    it("turns away an unusable file without decoding it", async () => {
        await expect(
            compressCommunityImage(file("application/pdf", 10))
        ).rejects.toThrow(/image/i);
        expect(createImageBitmap).not.toHaveBeenCalled();
    });

    it("says so when the canvas gives back no context", async () => {
        context = null;
        await expect(compressCommunityImage(jpeg())).rejects.toThrow(
            /could not read/i
        );
    });

    it("releases the bitmap whether it succeeds or fails", async () => {
        await compressCommunityImage(jpeg());
        expect(close).toHaveBeenCalledOnce();

        close.mockClear();
        sizeFor = () => COMMUNITY_IMAGE_MAX_BYTES + 1;
        await expect(compressCommunityImage(jpeg())).rejects.toThrow();
        expect(close).toHaveBeenCalledOnce();
    });
});
