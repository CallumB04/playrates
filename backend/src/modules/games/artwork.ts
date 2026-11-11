import type { GamesRepository } from "./games.repository.js";

/**
 * Each game's wide art, for a card to set behind itself: its banner where
 * it has one, its cover where it hasn't. One read for a page of rows.
 */
export const createArtworkLookup =
  (games: Pick<GamesRepository, "findByIds">) =>
  async (ids: number[]): Promise<Map<number, string | null>> => {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return new Map();
    const rows = await games.findByIds(unique);
    return new Map(rows.map((g) => [g.id, g.banner_url ?? g.cover_url]));
  };

export type ArtworkLookup = ReturnType<typeof createArtworkLookup>;
