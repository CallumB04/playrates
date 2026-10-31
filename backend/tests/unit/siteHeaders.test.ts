import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SITE_HEADERS } from "../../src/config/siteHeaders.js";

const vercel = JSON.parse(
  readFileSync(new URL("../../../vercel.json", import.meta.url), "utf8"),
) as {
  headers: { source: string; headers: { key: string; value: string }[] }[];
};

describe("site headers", () => {
  /* Static pages get them from vercel.json and rendered pages from the
     constant; a page should not be safer or looser for which one served it. */
  it("are the same in vercel.json as on pages Express renders", () => {
    const site = vercel.headers.find((rule) => rule.source === "/(.*)");
    const fromVercel = Object.fromEntries(
      (site?.headers ?? []).map(({ key, value }) => [key, value]),
    );

    expect(fromVercel).toEqual(SITE_HEADERS);
  });
});

describe("long-lived caching", () => {
  const rule = vercel.headers.find((r) => r.source.startsWith("/assets/"));
  // The pattern inside :file(...), as Vercel matches it against the name.
  const inner = rule!.source.slice("/assets/:file(".length, -1);
  const pattern = new RegExp(`^${inner}$`);

  it("covers the files Vite names by their content", () => {
    expect(pattern.test("index-C6kHGo2y.js")).toBe(true);
    expect(pattern.test("index-zh8pig9R.css")).toBe(true);
    expect(pattern.test("geist-latin-wght-normal-BgDaEnEv.woff2")).toBe(true);
  });

  it("leaves out files copied from public/ under their own name", () => {
    expect(pattern.test("background-texture.svg")).toBe(false);
  });

  it("caches them for a year, as nothing at that address will change", () => {
    expect(rule!.headers).toEqual([
      { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
    ]);
  });
});
