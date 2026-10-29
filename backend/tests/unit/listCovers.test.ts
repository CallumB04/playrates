import { describe, expect, it } from "vitest";
import { listCovers } from "../../src/modules/lists/lists.mapper.js";

describe("listCovers", () => {
  it("is the first four games when none are picked", () => {
    expect(listCovers(null, [5, 4, 3, 2, 1])).toEqual([5, 4, 3, 2]);
  });

  it("puts the picks first and fills the rest in the list's order", () => {
    expect(listCovers([3, 9], [9, 8, 7, 3])).toEqual([3, 9, 8, 7]);
  });

  it("passes over a pick that has left the list", () => {
    expect(listCovers([6, 2], [1, 2, 3])).toEqual([2, 1, 3]);
  });

  it("shows as many as there are, under four", () => {
    expect(listCovers(null, [1, 2])).toEqual([1, 2]);
    expect(listCovers(null, [])).toEqual([]);
  });
});
