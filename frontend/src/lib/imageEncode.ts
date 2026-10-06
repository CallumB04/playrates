/* Quality steps down only if the first encode comes out over the limit, so
   the fallbacks are for the noisy images that need them. */
const QUALITIES = [0.82, 0.7, 0.55, 0.4];

/* Safari cannot encode WebP. Asked for it, toBlob hands back a PNG, which
   ignores quality and blows through any cap; the server takes JPEG instead. */
const FALLBACK_MIME = "image/jpeg";

const encode = (
    canvas: HTMLCanvasElement,
    mime: string,
    quality: number
): Promise<Blob> =>
    new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) =>
                blob ? resolve(blob) : reject(new Error("Encoding failed")),
            mime,
            quality
        );
    });

/** JPEG has no transparency, and a transparent pixel would come out black. */
const flattened = (canvas: HTMLCanvasElement): HTMLCanvasElement => {
    const copy = document.createElement("canvas");
    copy.width = canvas.width;
    copy.height = canvas.height;
    const ctx = copy.getContext("2d");
    if (!ctx) return canvas;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, copy.width, copy.height);
    ctx.drawImage(canvas, 0, 0);
    return copy;
};

/** The canvas at the best quality that fits under the cap, in `mime` or, where
 *  the browser cannot encode that, JPEG. Null when even the lowest quality
 *  does not fit. The blob's own type says which it is. */
export const encodeWithin = async (
    canvas: HTMLCanvasElement,
    mime: string,
    maxBytes: number
): Promise<Blob | null> => {
    for (const quality of QUALITIES) {
        const blob = await encode(canvas, mime, quality);
        if (blob.type !== mime) break;
        if (blob.size <= maxBytes) return blob;
    }
    if (mime === FALLBACK_MIME) return null;

    const opaque = flattened(canvas);
    for (const quality of QUALITIES) {
        const blob = await encode(opaque, FALLBACK_MIME, quality);
        if (blob.type !== FALLBACK_MIME) return null;
        if (blob.size <= maxBytes) return blob;
    }
    return null;
};
