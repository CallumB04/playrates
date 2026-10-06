import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SITE_HEADERS } from "../../src/config/siteHeaders.js";

const vercel = JSON.parse(
  readFileSync(new URL("../../../vercel.json", import.meta.url), "utf8"),
) as { headers: { source: string; headers: { key: string; value: string }[] }[] };

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
