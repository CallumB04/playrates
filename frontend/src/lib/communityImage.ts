import {
    COMMUNITY_IMAGE_MAX_BYTES,
    COMMUNITY_IMAGE_MAX_EDGE,
    COMMUNITY_IMAGE_MIME,
} from "@playrates/shared";
import { rejectReason } from "./avatarImage";
import { encodeWithin } from "./imageEncode";

/** The size to draw a picture at: its longest edge no more than the cap, the
 *  shape kept, and never scaled up. */
export const fitWithin = (
    width: number,
    height: number,
    maxEdge: number = COMMUNITY_IMAGE_MAX_EDGE
): { width: number; height: number } => {
    const scale = Math.min(1, maxEdge / Math.max(width, height));
    return {
        width: Math.max(1, Math.round(width * scale)),
        height: Math.max(1, Math.round(height * scale)),
    };
};

/**
 * A picture for a message, the terms the API takes: WebP, uncropped, no
 * longer than COMMUNITY_IMAGE_MAX_EDGE on either side, under the byte cap.
 * The same file checks as an avatar, since both come from the same picker.
 */
export const compressCommunityImage = async (file: File): Promise<Blob> => {
    const reason = rejectReason(file);
    if (reason) throw new Error(reason);

    const bitmap = await createImageBitmap(file);
    try {
        const { width, height } = fitWithin(bitmap.width, bitmap.height);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Could not read that image");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(bitmap, 0, 0, width, height);

        const blob = await encodeWithin(
            canvas,
            COMMUNITY_IMAGE_MIME,
            COMMUNITY_IMAGE_MAX_BYTES
        );
        if (blob) return blob;
        throw new Error("That image won't compress small enough. Try another.");
    } finally {
        bitmap.close();
    }
};
