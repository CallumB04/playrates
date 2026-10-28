import { describe, expect, it } from "vitest";
import {
  GAMING_25_CATEGORIES,
  GAMING_25_CENTRE,
  GAMING_25_SIZE,
  Gaming25CategorySchema,
} from "@playrates/shared";
import {
  coverSize,
  gaming25Geometry,
} from "../../src/modules/gaming25/gaming25.image.js";
import { inGridOrder } from "../../src/modules/gaming25/gaming25.mapper.js";

describe("the categories", () => {
  it("are 25, each once, with the all-time favourite in the middle", () => {
    const keys = GAMING_25_CATEGORIES.map((c) => c.key);
    expect(GAMING_25_SIZE).toBe(25);
    expect(new Set(keys).size).toBe(25);
    expect(keys.indexOf(GAMING_25_CENTRE)).toBe(12);
  });

  it("are the only keys a pick may use", () => {
    expect(Gaming25CategorySchema.safeParse("best_story").success).toBe(true);
    expect(Gaming25CategorySchema.safeParse("best_shoes").success).toBe(false);
  });
});

describe("inGridOrder", () => {
  it("puts picks in the grid's order and drops retired categories", () => {
    expect(
      inGridOrder([
        { category: "everyone_should_play", game_id: 3 },
        { category: "best_multiplayer", game_id: 9 },
        { category: "childhood_classic", game_id: 1 },
        { category: "all_time_favourite", game_id: 2 },
      ]),
    ).toEqual([
      { category: "childhood_classic", gameId: 1 },
      { category: "all_time_favourite", gameId: 2 },
      { category: "everyone_should_play", gameId: 3 },
    ]);
  });
});

describe("gaming25Geometry", () => {
  for (const layout of ["portrait", "wide"] as const) {
    it(`fits the ${layout} grid on its canvas, covers upright at 3:4`, () => {
      const g = gaming25Geometry(layout);
      const right = g.origin.x + g.cell.width * 5 + g.gap * 4;
      const bottom = g.origin.y + g.cell.height * 5 + g.gap * 4;
      expect(right).toBeLessThanOrEqual(g.canvas.width);
      expect(bottom).toBeLessThanOrEqual(g.canvas.height);
      expect(g.cover.width).toBeLessThanOrEqual(g.cell.width);
      expect(g.cover.height + g.label).toBeLessThanOrEqual(g.cell.height);
      expect(g.cover.height / g.cover.width).toBeCloseTo(4 / 3, 1);
    });
  }

  it("labels the portrait covers and leaves the wide ones bare", () => {
    expect(gaming25Geometry("portrait").label).toBeGreaterThan(0);
    expect(gaming25Geometry("wide").label).toBe(0);
  });
});

describe("coverSize", () => {
  it("asks IGDB for the small cover, whatever size was stored", () => {
    expect(
      coverSize(
        "https://images.igdb.com/igdb/image/upload/t_cover_big_2x/co1wyy.jpg",
      ),
    ).toBe("https://images.igdb.com/igdb/image/upload/t_cover_big/co1wyy.jpg");
  });
});
