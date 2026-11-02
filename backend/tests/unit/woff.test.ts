import { deflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { woffToSfnt } from "../../src/lib/woff.js";
import { loadFonts, toPng } from "../../src/modules/gaming25/gaming25.image.js";

/** A WOFF holding these tables, each compressed or stored as asked. */
const woff = (tables: { tag: string; data: Buffer; compress: boolean }[]) => {
  const stored = tables.map((t) => (t.compress ? deflateSync(t.data) : t.data));
  const header = 44 + tables.length * 20;
  const out = Buffer.alloc(
    stored.reduce((n, d) => n + ((d.length + 3) & ~3), header),
  );
  out.writeUInt32BE(0x774f4646, 0);
  out.writeUInt32BE(0x00010000, 4);
  out.writeUInt32BE(out.length, 8);
  out.writeUInt16BE(tables.length, 12);
  let offset = header;
  tables.forEach((t, i) => {
    const at = 44 + i * 20;
    out.write(t.tag, at, "latin1");
    out.writeUInt32BE(offset, at + 4);
    out.writeUInt32BE(stored[i]!.length, at + 8);
    out.writeUInt32BE(t.data.length, at + 12);
    out.writeUInt32BE(0xabcd, at + 16);
    stored[i]!.copy(out, offset);
    offset += (stored[i]!.length + 3) & ~3;
  });
  return out;
};

describe("woffToSfnt", () => {
  it("unpacks each table, compressed or stored, into a plain font", () => {
    const big = Buffer.alloc(200, 7); // compresses well
    const tiny = Buffer.from("abc"); // stored: deflate wouldn't save room
    const sfnt = woffToSfnt(
      woff([
        { tag: "cmap", data: big, compress: true },
        { tag: "name", data: tiny, compress: false },
      ]),
    );

    expect(sfnt.readUInt32BE(0)).toBe(0x00010000);
    expect(sfnt.readUInt16BE(4)).toBe(2);
    // searchRange, entrySelector, rangeShift for two tables.
    expect([
      sfnt.readUInt16BE(6),
      sfnt.readUInt16BE(8),
      sfnt.readUInt16BE(10),
    ]).toEqual([32, 1, 0]);
    const entry = (i: number) => {
      const at = 12 + i * 16;
      const offset = sfnt.readUInt32BE(at + 8);
      const length = sfnt.readUInt32BE(at + 12);
      return {
        tag: sfnt.toString("latin1", at, at + 4),
        checksum: sfnt.readUInt32BE(at + 4),
        data: sfnt.subarray(offset, offset + length),
        aligned: offset % 4 === 0,
      };
    };
    expect(entry(0)).toEqual({
      tag: "cmap",
      checksum: 0xabcd,
      data: big,
      aligned: true,
    });
    expect(entry(1)).toEqual({
      tag: "name",
      checksum: 0xabcd,
      data: tiny,
      aligned: true,
    });
  });

  it("leaves a font that isn't WOFF as it is", () => {
    const ttf = Buffer.from([0, 1, 0, 0, 0, 0]);
    expect(woffToSfnt(ttf)).toBe(ttf);
  });

  it("refuses a table that doesn't unpack to its stated length", () => {
    const bad = woff([
      { tag: "glyf", data: Buffer.alloc(100, 1), compress: true },
    ]);
    bad.writeUInt32BE(101, 44 + 12);
    expect(() => woffToSfnt(bad)).toThrow(/stated length/);
  });
});

describe("the pictures' text", () => {
  /* Every letter drew as the same missing-glyph box once a dependency
     override broke satori's own WOFF unpacking. Two letters drawing alike
     is that. */
  it("draws each letter as itself, not as a box", async () => {
    const fonts = await loadFonts();
    const draw = (text: string) =>
      toPng(
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              fontSize: 48,
              color: "#000",
              fontFamily: "Geist",
            },
            children: text,
          },
        },
        { width: 120, height: 80 },
        fonts,
      );
    const [a, b] = await Promise.all([draw("A"), draw("B")]);
    expect(a.equals(b)).toBe(false);
  });
});
