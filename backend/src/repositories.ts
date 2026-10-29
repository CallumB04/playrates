import {
  createFavouritesRepository,
  type FavouritesRepository,
} from "./modules/favourites/favourites.repository.js";
import type { Db } from "./config/supabase.js";
import {
  createProgressRepository,
  type ProgressRepository,
} from "./modules/progress/progress.repository.js";
import {
  createGaming25Repository,
  type Gaming25Repository,
} from "./modules/gaming25/gaming25.repository.js";
import {
  createListsRepository,
  type ListsRepository,
} from "./modules/lists/lists.repository.js";
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
import {
  createNotificationsRepository,
  type NotificationsRepository,
} from "./modules/notifications/notifications.repository.js";
import {
  createGameEventsRepository,
  type GameEventsRepository,
} from "./modules/games/gameEvents.repository.js";
import {
  createAdminRepository,
  type AdminRepository,
} from "./modules/admin/admin.repository.js";
import {
  createAccountExportRepository,
  type AccountExportRepository,
} from "./modules/profiles/accountExport.repository.js";
import {
  createReportsRepository,
  type ReportsRepository,
} from "./modules/reports/reports.repository.js";
import {
  createSitemapRepository,
  type SitemapRepository,
} from "./modules/pages/sitemap.repository.js";
import {
  createEmailRepository,
  type EmailRepository,
} from "./modules/email/email.repository.js";
import {
  createCommunityRepository,
  type CommunityRepository,
} from "./modules/community/community.repository.js";

/** Every repository in one bundle. Tests swap the whole object and still run
 *  the real middleware and validation. */
export interface Repositories {
  profiles: ProfilesRepository;
  games: GamesRepository;
  gameLogs: GameLogsRepository;
  reviews: ReviewsRepository;
  friends: FriendsRepository;
  notifications: NotificationsRepository;
  community: CommunityRepository;
  platforms: PlatformsRepository;
  genres: GenresRepository;
  gameEvents: GameEventsRepository;
  admin: AdminRepository;
  accountExport: AccountExportRepository;
  reports: ReportsRepository;
  sitemap: SitemapRepository;
  favourites: FavouritesRepository;
  lists: ListsRepository;
  gaming25: Gaming25Repository;
  progress: ProgressRepository;
  email: EmailRepository;
}

export const createRepositories = (db: Db): Repositories => ({
  profiles: createProfilesRepository(db),
  games: createGamesRepository(db),
  gameLogs: createGameLogsRepository(db),
  reviews: createReviewsRepository(db),
  friends: createFriendsRepository(db),
  notifications: createNotificationsRepository(db),
  community: createCommunityRepository(db),
  platforms: createPlatformsRepository(db),
  genres: createGenresRepository(db),
  gameEvents: createGameEventsRepository(db),
  admin: createAdminRepository(db),
  accountExport: createAccountExportRepository(db),
  reports: createReportsRepository(db),
  sitemap: createSitemapRepository(db),
  favourites: createFavouritesRepository(db),
  lists: createListsRepository(db),
  gaming25: createGaming25Repository(db),
  progress: createProgressRepository(db),
  email: createEmailRepository(db),
});
