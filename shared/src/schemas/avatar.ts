/**
 * What a profile picture has to be by the time it reaches the API.
 *
 * The browser does the crop and the compression, so these are the terms both
 * ends agree on: the client encodes to them and the server refuses anything
 * that misses. Keeping them here is what stops the two drifting apart.
 */

/** Stored square, at 2x the largest place it is drawn (the 160px header). */
export const AVATAR_PIXELS = 320;

/** WebP only. One format in the bucket means one decoder path everywhere. */
export const AVATAR_MIME = "image/webp";

/** 128KB. A 320px WebP lands well under this; anything over has not been
 *  through the compressor. */
export const AVATAR_MAX_BYTES = 128 * 1024;

/** What the file picker will take before compression. Anything a phone camera
 *  produces fits, and the compressor is what brings it down. */
export const AVATAR_SOURCE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/heic",
  "image/heif",
] as const;

/** 20MB in, before compression. A modern phone photo is 3-8MB. */
export const AVATAR_SOURCE_MAX_BYTES = 20 * 1024 * 1024;

/** The first twelve bytes of a WebP: "RIFF" ---- "WEBP". */
export const isWebp = (bytes: Uint8Array): boolean =>
  bytes.length > 12 &&
  bytes[0] === 0x52 && // R
  bytes[1] === 0x49 && // I
  bytes[2] === 0x46 && // F
  bytes[3] === 0x46 && // F
  bytes[8] === 0x57 && // W
  bytes[9] === 0x45 && // E
  bytes[10] === 0x42 && // B
  bytes[11] === 0x50; // P
