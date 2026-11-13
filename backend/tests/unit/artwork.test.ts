import { describe, expect, it, vi } from "vitest";
import { createArtworkLookup } from "../../src/modules/games/artwork.js";
import { buildGame } from "../helpers/fixtures.js";

describe("the artwork lookup", () => {
  it("gives each game its banner, or its cover where it has none", async () => {
    const lookup = createArtworkLookup({
      findByIds: async () => [
        {
          ...buildGame({ id: 1, banner_url: "https://img.test/b.jpg" }),
          platforms: [],
        },
        {
          ...buildGame({ id: 2, cover_url: "https://img.test/c.jpg" }),
          platforms: [],
        },
      ],
    } as never);
    const art = await lookup([1, 2, 1]);
    expect(art.get(1)).toBe("https://img.test/b.jpg");
    expect(art.get(2)).toBe("https://img.test/c.jpg");
  });

  it("reads nothing for nothing", async () => {
    const findByIds = vi.fn();
    const art = await createArtworkLookup({ findByIds })([]);
    expect(art.size).toBe(0);
    expect(findByIds).not.toHaveBeenCalled();
  });
});
