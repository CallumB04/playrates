import type { Db } from "./config/supabase.js";
import {
  createProfilesRepository,
  type ProfilesRepository,
} from "./modules/profiles/profiles.repository.js";
import {
  createGamesRepository,
  type GamesRepository,
} from "./modules/games/games.repository.js";
import {
  createGameLogsRepository,
  type GameLogsRepository,
} from "./modules/game-logs/gameLogs.repository.js";
import {
  createReviewsRepository,
  type ReviewsRepository,
} from "./modules/reviews/reviews.repository.js";
import {
  createFriendsRepository,
  type FriendsRepository,
} from "./modules/friends/friends.repository.js";
import {
  createPlatformsRepository,
  type PlatformsRepository,
} from "./modules/platforms/platforms.js";
import {
  createGenresRepository,
  type GenresRepository,
} from "./modules/genres/genres.js";

/** Every repository in one bundle. Tests swap the whole object for in-memory
 *  equivalents and still exercise the real middleware and validation. */
export interface Repositories {
  profiles: ProfilesRepository;
  games: GamesRepository;
  gameLogs: GameLogsRepository;
  reviews: ReviewsRepository;
  friends: FriendsRepository;
  platforms: PlatformsRepository;
  genres: GenresRepository;
}

export const createRepositories = (db: Db): Repositories => ({
  profiles: createProfilesRepository(db),
  games: createGamesRepository(db),
  gameLogs: createGameLogsRepository(db),
  reviews: createReviewsRepository(db),
  friends: createFriendsRepository(db),
  platforms: createPlatformsRepository(db),
  genres: createGenresRepository(db),
});
