import {
  headlineOf,
  type FavouriteGame,
  type GameStatus,
  type PlayedStatus,
} from "@playrates/shared";
import { AppError } from "../../lib/AppError.js";
import type { GameLogsRepository } from "../game-logs/gameLogs.repository.js";
import type { GamesRepository } from "../games/games.repository.js";
import { toGame, type GameRowWithPlatforms } from "../games/games.mapper.js";
import type { ProfileGate } from "../profiles/profileGate.js";
import type { FavouritesRepository } from "./favourites.repository.js";

/** The rows in the order of the ids, the ones that have gone left out. */
const inOrder = (
  rows: GameRowWithPlatforms[],
  ids: number[],
): GameRowWithPlatforms[] => {
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.flatMap((id) => byId.get(id) ?? []);
};

export const createFavouritesService = (
  repo: FavouritesRepository,
  games: GamesRepository,
  gate: ProfileGate,
  logs: Pick<GameLogsRepository, "listByUserAndGames">,
) => {
  /** Each game with where its owner has it: their games are behind the same
   *  gate as their favourites, so whoever sees one may see the other. */
  const withOwnerStatus = async (
    ownerId: string,
    rows: GameRowWithPlatforms[],
  ): Promise<FavouriteGame[]> => {
    const owned = await logs.listByUserAndGames(
      ownerId,
      rows.map((row) => row.id),
    );
    return rows.map((row) => {
      const headline = headlineOf(
        owned
          .filter((log) => log.game_id === row.id)
          .map((log) => ({
            id: log.id,
            status: log.status as GameStatus,
            playedStatus: log.played_status as PlayedStatus | null,
          })),
      );
      return {
        ...toGame(row),
        ownerStatus: headline
          ? { status: headline.status, playedStatus: headline.playedStatus }
          : null,
      };
    });
  };

  return {
    /** Part of a profile past its card, so its visibility decides. */
    async listForUsername(
      username: string,
      viewerId?: string,
    ): Promise<FavouriteGame[]> {
      const profile = await gate(username, viewerId);
      const ids = await repo.listIds(profile.id);
      if (ids.length === 0) return [];
      // A game flagged adult since it was chosen is not shown either.
      return withOwnerStatus(
        profile.id,
        inOrder(await games.findByIds(ids), ids).filter(
          (row) => !row.has_sexual_content,
        ),
      );
    },

    /** Up to six, from anywhere in the catalogue, logged or not. */
    async setOwn(userId: string, gameIds: number[]): Promise<FavouriteGame[]> {
      const rows =
        gameIds.length > 0
          ? inOrder(await games.findByIds(gameIds), gameIds)
          : [];
      if (rows.length !== gameIds.length) throw AppError.notFound("Game");
      /* The favourites are shown to everyone who may see the profile, people
         who have chosen not to see adult games among them. */
      if (rows.some((row) => row.has_sexual_content)) {
        throw AppError.validation("An adult game can't be a favourite");
      }
      await repo.set(userId, gameIds);
      return withOwnerStatus(userId, rows);
    },
  };
};

export type FavouritesService = ReturnType<typeof createFavouritesService>;
