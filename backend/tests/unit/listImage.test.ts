import { describe, expect, it } from "vitest";
import type { GameListEntry } from "@playrates/shared";
import {
  mosaicFor,
  ownerTheme,
  shareGames,
} from "../../src/modules/lists/lists.image.js";

const entries = (...ids: number[]): GameListEntry[] =>
  ids.map((id, i) => ({
    game: { id, title: `Game ${id}` } as GameListEntry["game"],
    rank: i + 1,
    addedAt: "2026-10-01T00:00:00Z",
  }));

const ids = (list: GameListEntry[]) => list.map((e) => e.game.id);

describe("shareGames", () => {
  it("shows a ranked list's top in order, whatever covers were picked", () => {
    const games = entries(1, 2, 3, 4);
    expect(
      ids(shareGames({ ranked: true, coverGameIds: [4], games }, 3)),
    ).toEqual([1, 2, 3]);
  });

  it("leads an unranked list with its picked covers, then fills in order", () => {
    const games = entries(1, 2, 3, 4, 5);
    expect(
      ids(shareGames({ ranked: false, coverGameIds: [4, 2], games }, 4)),
    ).toEqual([4, 2, 1, 3]);
  });

  it("passes over a pick that has left the list", () => {
    const games = entries(1, 2);
    expect(
      ids(shareGames({ ranked: false, coverGameIds: [9, 2], games }, 6)),
    ).toEqual([2, 1]);
  });
});

describe("mosaicFor", () => {
  const shape = (count: number) => {
    const { columns, rows } = mosaicFor(count);
    return [columns, rows];
  };

  it("fills whole rows only", () => {
    expect(shape(0)).toEqual([1, 1]);
    expect(shape(1)).toEqual([1, 1]);
    expect(shape(3)).toEqual([3, 1]);
    expect(shape(4)).toEqual([2, 2]);
    expect(shape(5)).toEqual([2, 2]);
    expect(shape(6)).toEqual([3, 2]);
    expect(shape(40)).toEqual([3, 2]);
  });

  it("keeps a lone cover from filling the picture", () => {
    expect(mosaicFor(1).cover.width).toBeLessThan(mosaicFor(2).cover.width * 2);
    expect(mosaicFor(1).cover.width).toBeLessThanOrEqual(480);
  });
});

describe("ownerTheme", () => {
  const profiles = (card_theme: string | null) => ({
    findByUsername: async () => ({ card_theme }) as never,
  });

  it("is the theme the owner wears", async () => {
    expect(await ownerTheme(profiles("gold"), "devuser")).toBe("gold");
  });

  it("is the default for none, one it doesn't know, or no lookup", async () => {
    expect(await ownerTheme(profiles(null), "devuser")).toBe("default");
    expect(await ownerTheme(profiles("vapor"), "devuser")).toBe("default");
    expect(await ownerTheme(undefined, "devuser")).toBe("default");
  });
});
