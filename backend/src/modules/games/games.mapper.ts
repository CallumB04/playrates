import type { Game } from "@playrates/shared";
import type { GameRow } from "../../types/database.types.js";

/** A games row with its platform and genre joins pulled in. */
export interface GameRowWithRelations extends GameRow {
  game_platforms?: { platform_slug: string }[] | null;
  game_systems?: { system_slug: string }[] | null;
  game_genres?: { genre_slug: string }[] | null;
}

/** Postgres numerics arrive as strings through some drivers. */
const num = (value: number | null): number | null =>
  value === null ? null : Number(value);

export const toGame = (row: GameRowWithRelations): Game => ({
  id: row.id,
  rawgId: row.rawg_id,
  slug: row.slug,
  title: row.title,
  description: row.description,
  // The portrait one where we found it; RAWG's landscape image otherwise.
  coverUrl: row.box_art_url ?? row.cover_url,
  releaseDate: row.release_date,
  platforms: (row.game_platforms ?? []).map((p) => p.platform_slug),
  systems: (row.game_systems ?? []).map((s) => s.system_slug),
  genres: (row.game_genres ?? []).map((g) => g.genre_slug),
  developers: row.developers ?? [],
  publishers: row.publishers ?? [],
  website: row.website,
  esrbRating: row.esrb_rating,
  hasSexualContent: row.has_sexual_content,
  isTrending: row.is_trending,
  playtimeHours: num(row.playtime_hours),
  metacritic: row.metacritic,
  rawgRating: num(row.rawg_rating),
  rawgRatingCount: row.rawg_rating_count,
  logCount: row.log_count,
  avgRating: num(row.avg_rating),
  ratingCount: row.rating_count,
});

/** Kept for the existing import name. */
export type GameRowWithPlatforms = GameRowWithRelations;
