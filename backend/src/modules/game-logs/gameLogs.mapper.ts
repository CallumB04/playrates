import type {
  GameLog,
  GameLogInput,
  GameStatus,
  PlayedStatus,
} from "@playrates/shared";
import type { GameLogRow } from "../../types/database.types.js";
import type { GameRowWithPlatforms } from "../games/games.mapper.js";
import { toGame } from "../games/games.mapper.js";
import type { Game } from "@playrates/shared";

export interface GameLogRowWithGame extends GameLogRow {
  game?: GameRowWithPlatforms | null;
}

export interface GameLogWithGame extends GameLog {
  game: Pick<
    Game,
    | "id"
    | "title"
    | "slug"
    | "coverUrl"
    | "releaseDate"
    | "platforms"
    /** So a shelf ordered by one of these can print what it ordered on. */
    | "avgRating"
    | "metacritic"
  > | null;
}

export const toGameLog = (row: GameLogRow): GameLog => ({
  // the log's own id; the game it refers to is `gameId` below
  id: row.id,
  gameId: row.game_id,
  status: row.status as GameStatus,
  playedStatus: (row.played_status as PlayedStatus | null) ?? null,
  rating: row.rating === null ? null : Number(row.rating),
  hoursPlayed: row.hours_played === null ? null : Number(row.hours_played),
  hoursToBeat: row.hours_to_beat === null ? null : Number(row.hours_to_beat),
  startDate: row.start_date,
  finishDate: row.finish_date,
  platform: row.platform_slug,
  system: row.system_slug,
  achievementsTotal: row.achievements_total,
  achievementsCompleted: row.achievements_completed,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/** Embedding the game is what removes the one-request-per-tile pattern. */
export const toGameLogWithGame = (row: GameLogRowWithGame): GameLogWithGame => {
  const log = toGameLog(row);
  if (!row.game) return { ...log, game: null };

  const game = toGame(row.game);
  return {
    ...log,
    game: {
      id: game.id,
      title: game.title,
      slug: game.slug,
      coverUrl: game.coverUrl,
      releaseDate: game.releaseDate,
      platforms: game.platforms,
      avgRating: game.avgRating,
      metacritic: game.metacritic,
    },
  };
};

/** playedStatus only means anything on a played log, and a CHECK enforces it.
 *  Normalise rather than reject an otherwise valid write. */
export const toGameLogRow = (
  input: Partial<GameLogInput>,
): Partial<GameLogRow> => {
  const row: Partial<GameLogRow> = {};

  if (input.status !== undefined) row.status = input.status;
  if (input.rating !== undefined) row.rating = input.rating ?? null;
  if (input.hoursPlayed !== undefined) {
    row.hours_played = input.hoursPlayed ?? null;
  }
  if (input.hoursToBeat !== undefined) {
    row.hours_to_beat = input.hoursToBeat ?? null;
  }
  if (input.startDate !== undefined) row.start_date = input.startDate ?? null;
  if (input.finishDate !== undefined) {
    row.finish_date = input.finishDate ?? null;
  }
  if (input.platform !== undefined) row.platform_slug = input.platform ?? null;
  if (input.system !== undefined) row.system_slug = input.system ?? null;
  if (input.achievementsTotal !== undefined) {
    row.achievements_total = input.achievementsTotal ?? null;
  }
  if (input.achievementsCompleted !== undefined) {
    row.achievements_completed = input.achievementsCompleted ?? null;
  }

  if (input.playedStatus !== undefined || input.status !== undefined) {
    row.played_status =
      input.status === "played" ? (input.playedStatus ?? null) : null;
  }

  return row;
};
