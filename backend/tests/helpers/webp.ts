import sharp from "sharp";

/** A genuine WebP, since uploads are decoded now rather than only sniffed. */
export const realWebp = (edge = 16): Promise<Buffer> =>
  sharp({
    create: {
      width: edge,
      height: edge,
      channels: 3,
      background: { r: 124, g: 92, b: 255 },
    },
  })
    .webp()
    .toBuffer();

/** A real WebP with something else riding along after it. */
export const webpWithPayload = async (payload: string): Promise<Buffer> =>
  Buffer.concat([await realWebp(), Buffer.from(payload)]);

/** A genuine JPEG, which is what Safari uploads: it cannot encode WebP. */
export const realJpeg = (edge = 16): Promise<Buffer> =>
  sharp({
    create: {
      width: edge,
      height: edge,
      channels: 3,
      background: { r: 124, g: 92, b: 255 },
    },
  })
    .jpeg()
    .toBuffer();
