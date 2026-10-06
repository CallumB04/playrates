import sharp from "sharp";
import { isWebp } from "@playrates/shared";
import { AppError } from "./AppError.js";

// The same ladder the browser encoder walks, so an honest upload comes back
// close to what was sent.
const QUALITIES = [82, 70, 55, 40];

interface CleanOptions {
  /** Longest edge the client encodes to; anything larger did not come from
   *  our uploader. */
  maxEdge: number;
  maxBytes: number;
}

/**
 * Decodes an uploaded WebP and encodes a fresh one from the pixels.
 *
 * The header check alone would pass a file that is WebP for twelve bytes and
 * something else after; storing only what the decoder produced leaves nothing
 * of the original but the picture, metadata included.
 */
export const cleanWebp = async (
  bytes: Buffer,
  { maxEdge, maxBytes }: CleanOptions,
): Promise<Buffer> => {
  if (!isWebp(bytes)) throw AppError.badRequest("A picture must be a WebP image");

  const image = sharp(bytes, { failOn: "error", limitInputPixels: maxEdge ** 2 });
  const meta = await image.metadata().catch(() => null);
  if (
    !meta ||
    meta.format !== "webp" ||
    !meta.width ||
    !meta.height ||
    Math.max(meta.width, meta.height) > maxEdge
  ) {
    throw AppError.badRequest("That picture could not be read");
  }

  for (const quality of QUALITIES) {
    const out = await image
      .clone()
      .webp({ quality })
      .toBuffer()
      .catch(() => null);
    if (!out) throw AppError.badRequest("That picture could not be read");
    if (out.length <= maxBytes) return out;
  }
  throw AppError.badRequest("That picture is too large");
};
