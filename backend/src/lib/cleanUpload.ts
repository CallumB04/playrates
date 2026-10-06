import sharp from "sharp";
import { isJpeg, isWebp } from "@playrates/shared";
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
 * Decodes an uploaded picture and encodes a fresh WebP from the pixels.
 *
 * WebP from most browsers, JPEG from Safari, which cannot encode WebP. The
 * header check alone would pass a file that is a picture for a few bytes and
 * something else after; storing only what the decoder produced leaves
 * nothing of the original but the picture, metadata included.
 */
export const cleanUpload = async (
  bytes: Buffer,
  { maxEdge, maxBytes }: CleanOptions,
): Promise<Buffer> => {
  if (!isWebp(bytes) && !isJpeg(bytes)) {
    throw AppError.badRequest("A picture must be a WebP or JPEG image");
  }

  const image = sharp(bytes, { failOn: "error", limitInputPixels: maxEdge ** 2 });
  const meta = await image.metadata().catch(() => null);
  if (
    !meta ||
    (meta.format !== "webp" && meta.format !== "jpeg") ||
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
