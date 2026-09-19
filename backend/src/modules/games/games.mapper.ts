import type { Game } from "@playrates/shared";
import type { GameRow } from "../../types/database.types.js";

/** A games row joined with its platform slugs. */
export interface GameRowWithPlatforms extends GameRow {
  game_platforms?: { platform_slug: string }[] | null;
}

export const toGame = (row: GameRowWithPlatforms): Game => ({
  id: row.id,
  rawgId: row.rawg_id,
  slug: row.slug,
  title: row.title,
  description: row.description,
  coverUrl: row.cover_url,
  releaseDate: row.release_date,
  platforms: (row.game_platforms ?? []).map((p) => p.platform_slug),
  isAdult: row.is_adult,
  isTrending: row.is_trending,
  hoursToBeat: row.hours_to_beat,
});
