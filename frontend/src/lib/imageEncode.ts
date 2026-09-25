/* Quality steps down only if the first encode comes out over the limit, so
   the fallbacks are for the noisy images that need them. */
const QUALITIES = [0.82, 0.7, 0.55, 0.4];

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

/** The canvas at the best quality that fits under the cap, or null when even
 *  the lowest does not. */
export const encodeWithin = async (
    canvas: HTMLCanvasElement,
    mime: string,
    maxBytes: number
): Promise<Blob | null> => {
    for (const quality of QUALITIES) {
        const blob = await encode(canvas, mime, quality);
        if (blob.size <= maxBytes) return blob;
    }
    return null;
};
