import {
    AVATAR_MAX_BYTES,
    AVATAR_MIME,
    AVATAR_PIXELS,
    AVATAR_SOURCE_MAX_BYTES,
    AVATAR_SOURCE_TYPES,
} from "@playrates/shared";
import { encodeWithin } from "./imageEncode";

export interface CropRect {
    sx: number;
    sy: number;
    size: number;
}

/** The largest centred square inside the image, in source pixels. */
export const centreCrop = (width: number, height: number): CropRect => {
    const size = Math.min(width, height);
    return { sx: (width - size) / 2, sy: (height - size) / 2, size };
};

/** What to draw it at: square, and never upscaled past what was given. */
export const targetPixels = (cropSize: number): number =>
    Math.min(AVATAR_PIXELS, Math.round(cropSize));

/** Why a file can't be used, or null if it can. */
export const rejectReason = (file: File): string | null => {
    if (!(AVATAR_SOURCE_TYPES as readonly string[]).includes(file.type)) {
        return "That needs to be an image: JPEG, PNG, WebP, GIF or HEIC.";
    }
    if (file.size > AVATAR_SOURCE_MAX_BYTES) {
        return "That image is over 20MB. Try a smaller one.";
    }
    return null;
};

/**
 * A picture the API will take: centre-cropped square, AVATAR_PIXELS across,
 * WebP, under the byte cap. Doing it here rather than on the server keeps a
 * 8MB phone photo off the wire entirely.
 */
export const compressAvatar = async (file: File): Promise<Blob> => {
    const reason = rejectReason(file);
    if (reason) throw new Error(reason);

    const bitmap = await createImageBitmap(file);
    try {
        const { sx, sy, size } = centreCrop(bitmap.width, bitmap.height);
        const pixels = targetPixels(size);

        const canvas = document.createElement("canvas");
        canvas.width = pixels;
        canvas.height = pixels;

        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Could not read that image");
        // Downscaling a photo by 10x without this gives a crunchy result.
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(bitmap, sx, sy, size, size, 0, 0, pixels, pixels);

        const blob = await encodeWithin(canvas, AVATAR_MIME, AVATAR_MAX_BYTES);
        if (blob) return blob;
        throw new Error("That image won't compress small enough. Try another.");
    } finally {
        bitmap.close();
    }
};
