import { describe, expect, it } from "vitest";
import { seedGame } from "../../scripts/local/catalogueRows.js";

describe("seedGame", () => {
  // The snapshot predates alt_names; a null there failed every local reset.
  it("gives a game from an older snapshot no alternate names", () => {
    expect(seedGame({ id: 1, title: "Hades" }).alt_names).toEqual([]);
  });

  it("keeps the alternate names a snapshot carries", () => {
    const row = seedGame({
      id: 2,
      title: "Grand Theft Auto V",
      alt_names: ["GTA V"],
    });
    expect(row.alt_names).toEqual(["GTA V"]);
  });

  it("leaves the counts to the triggers", () => {
    expect(
      seedGame({ id: 3, log_count: 912, avg_rating: 4.4, rating_count: 300 }),
    ).toMatchObject({ log_count: 0, avg_rating: null, rating_count: 0 });
  });
});
