import { inflateSync } from "node:zlib";

const WOFF_SIGNATURE = 0x774f4646; // "wOFF"
const WOFF_HEADER = 44;
const WOFF_ENTRY = 20;
const SFNT_HEADER = 12;
const SFNT_ENTRY = 16;

const pad4 = (n: number) => (n + 3) & ~3;

/**
 * A WOFF font unpacked to the plain TrueType/OpenType font inside it, so
 * satori never unpacks it itself: satori 0.33 does that with fflate, and the
 * fflate the security override pins (0.8) fills the tables with nothing, so
 * every letter drew as a box. A font that isn't WOFF comes back as it is.
 */
export const woffToSfnt = (font: Buffer): Buffer => {
  if (font.length < WOFF_HEADER || font.readUInt32BE(0) !== WOFF_SIGNATURE) {
    return font;
  }
  const numTables = font.readUInt16BE(12);
  const tables = Array.from({ length: numTables }, (_, i) => {
    const at = WOFF_HEADER + i * WOFF_ENTRY;
    return {
      tag: font.readUInt32BE(at),
      offset: font.readUInt32BE(at + 4),
      compLength: font.readUInt32BE(at + 8),
      origLength: font.readUInt32BE(at + 12),
      checksum: font.readUInt32BE(at + 16),
    };
  });

  const headerSize = SFNT_HEADER + numTables * SFNT_ENTRY;
  const out = Buffer.alloc(
    tables.reduce((size, t) => size + pad4(t.origLength), headerSize),
  );

  // The sfnt header: its flavour, and the binary-search fields over the
  // table directory that the format asks for.
  let entrySelector = 0;
  while (2 ** (entrySelector + 1) <= numTables) entrySelector += 1;
  const searchRange = 2 ** entrySelector * SFNT_ENTRY;
  out.writeUInt32BE(font.readUInt32BE(4), 0);
  out.writeUInt16BE(numTables, 4);
  out.writeUInt16BE(searchRange, 6);
  out.writeUInt16BE(entrySelector, 8);
  out.writeUInt16BE(numTables * SFNT_ENTRY - searchRange, 10);

  let offset = headerSize;
  tables.forEach((t, i) => {
    const stored = font.subarray(t.offset, t.offset + t.compLength);
    // A table is stored as it is when compressing wouldn't have saved space.
    const data = t.compLength < t.origLength ? inflateSync(stored) : stored;
    if (data.length !== t.origLength) {
      throw new Error("WOFF table doesn't unpack to its stated length");
    }
    const entry = SFNT_HEADER + i * SFNT_ENTRY;
    out.writeUInt32BE(t.tag, entry);
    out.writeUInt32BE(t.checksum, entry + 4);
    out.writeUInt32BE(offset, entry + 8);
    out.writeUInt32BE(t.origLength, entry + 12);
    data.copy(out, offset);
    offset += pad4(t.origLength);
  });
  return out;
};
