import type { Game } from "@playrates/shared";
import type { GameRow } from "../../types/database.types.js";

/** A games row with its platform and genre joins pulled in. */
export interface GameRowWithRelations extends GameRow {
  game_platforms?: { platform_slug: string }[] | null;
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
  coverUrl: row.cover_url,
  releaseDate: row.release_date,
  platforms: (row.game_platforms ?? []).map((p) => p.platform_slug),
  genres: (row.game_genres ?? []).map((g) => g.genre_slug),
  isAdult: row.is_adult,
  isTrending: row.is_trending,
  playtimeHours: num(row.playtime_hours),
  metacritic: row.metacritic,
  rawgRating: num(row.rawg_rating),
  rawgRatingCount: row.rawg_rating_count,
});

/** Kept for the existing import name. */
export type GameRowWithPlatforms = GameRowWithRelations;
