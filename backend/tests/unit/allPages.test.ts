import { describe, expect, it } from "vitest";
import { allPages, MAX_ROWS } from "../../src/lib/allPages.js";

/** A table of `n` rows behind PostgREST's cap. */
const capped = (n: number) => {
  const rows = Array.from({ length: n }, (_, i) => i);
  const asked: [number, number][] = [];
  const fetchPage = async (from: number, to: number) => {
    asked.push([from, to]);
    return rows.slice(from, Math.min(to + 1, from + MAX_ROWS));
  };
  return { fetchPage, asked };
};

describe("allPages", () => {
  it("reads past the thousandth row", async () => {
    const { fetchPage, asked } = capped(2500);

    const rows = await allPages(fetchPage);

    expect(rows).toHaveLength(2500);
    expect(rows.at(-1)).toBe(2499);
    expect(asked).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  it("stops after one page when there's less than one", async () => {
    const { fetchPage, asked } = capped(3);
    expect(await allPages(fetchPage)).toEqual([0, 1, 2]);
    expect(asked).toHaveLength(1);
  });

  it("asks once more when the last page is exactly full", async () => {
    const { fetchPage, asked } = capped(1000);
    expect(await allPages(fetchPage)).toHaveLength(1000);
    expect(asked).toHaveLength(2);
  });
});
