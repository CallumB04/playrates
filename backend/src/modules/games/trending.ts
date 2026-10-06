import type { GamesProvider } from "../../providers/games/GamesProvider.js";
import type { GamesRepository } from "./games.repository.js";

/** How many make the trending set. More than a rail shows, so a viewer's
 *  content filter and their own logs still leave it full. */
export const TRENDING_SIZE = 20;

/** How far down IGDB's list to look, since not every game on it is in the
 *  catalogue. */
const CANDIDATES = 200;

/**
 * Sets the trending games from what IGDB says is trending, in its order,
 * leaving out anything adult. Keeps the set it has when IGDB returns
 * nothing it recognises, rather than emptying the rail.
 */
export const refreshTrending = async (
  provider: GamesProvider,
  repo: Pick<GamesRepository, "listByIgdbIds" | "replaceTrending">,
): Promise<{ trending: number }> => {
  const igdbIds = await provider.trendingIds(CANDIDATES);
  const rows = await repo.listByIgdbIds(igdbIds, false);
  const ids = rows.slice(0, TRENDING_SIZE).map((row) => row.id);
  if (ids.length > 0) await repo.replaceTrending(ids);
  return { trending: ids.length };
};
