import { Router, type RequestHandler } from "express";
import type { Repositories } from "./repositories.js";
import type { AuthAdmin } from "./config/authAdmin.js";
import type { AvatarStore } from "./config/avatarStore.js";
import type { CommunityImageStore } from "./config/communityImageStore.js";
import type { GamesProvider } from "./providers/games/GamesProvider.js";
import { createFavouritesService } from "./modules/favourites/favourites.service.js";
import {
  createMyFavouritesRouter,
  createUserFavouritesRouter,
} from "./modules/favourites/favourites.routes.js";
import { createProgressService } from "./modules/progress/progress.service.js";
import {
  createMyProgressRouter,
  createProgressRouter,
  createReferralsRouter,
  createShopRouter,
} from "./modules/progress/progress.routes.js";
import { createGaming25Service } from "./modules/gaming25/gaming25.service.js";
import {
  createGaming25Router,
  createMyGaming25Router,
  createUserGaming25Router,
} from "./modules/gaming25/gaming25.routes.js";
import { createProfilesService } from "./modules/profiles/profiles.service.js";
import { createProfilesRouter } from "./modules/profiles/profiles.routes.js";
import { createProfileGate } from "./modules/profiles/profileGate.js";
import { createListsService } from "./modules/lists/lists.service.js";
import {
  createGameListsRouter,
  createListsRouter,
  createMyListsRouter,
  createUserListsRouter,
} from "./modules/lists/lists.routes.js";
import { createGamesService } from "./modules/games/games.service.js";
import { createGamesRouter } from "./modules/games/games.routes.js";
import { createCronRouter } from "./modules/games/cron.routes.js";
import { env } from "./config/env.js";
import { createGameLogsService } from "./modules/game-logs/gameLogs.service.js";
import {
  createMyGameLogsRouter,
  createMyLogsRouter,
  createMyShelfRouter,
  createUserGameLogsRouter,
  createUserLogsRouter,
  createUserShelfRouter,
  createUserWishlistRouter,
  createMyWishlistRouter,
  createUserStatsRouter,
} from "./modules/game-logs/gameLogs.routes.js";
import { createReviewsService } from "./modules/reviews/reviews.service.js";
import {
  createGameReviewsRouter,
  createReviewsFeedRouter,
  createMyReviewsRouter,
  createUserReviewsRouter,
} from "./modules/reviews/reviews.routes.js";
import { createFriendsService } from "./modules/friends/friends.service.js";
import {
  createMyFriendsRouter,
  createUserFriendsRouter,
} from "./modules/friends/friends.routes.js";
import { createNotificationsService } from "./modules/notifications/notifications.service.js";
import { createMyNotificationsRouter } from "./modules/notifications/notifications.routes.js";
import { createCommunityService } from "./modules/community/community.service.js";
import { createCommunityRouter } from "./modules/community/community.routes.js";
import { createPlatformsRouter } from "./modules/platforms/platforms.js";
import { createGenresRouter } from "./modules/genres/genres.js";
import { createStatsRouter } from "./modules/stats/stats.js";
import { createAdminService } from "./modules/admin/admin.service.js";
import { createAdminRouter } from "./modules/admin/admin.routes.js";
import { requireAdmin } from "./middleware/requireAdmin.js";
import { createReportsService } from "./modules/reports/reports.service.js";
import {
  createAdminReportsRouter,
  createReportsRouter,
} from "./modules/reports/reports.routes.js";

interface Deps {
  repos: Repositories;
  provider: GamesProvider;
  /** Auth admin lives outside the repository bundle — it is not a table. */
  authAdmin: AuthAdmin;
  avatars: AvatarStore;
  communityImages: CommunityImageStore;
  requireAuth: RequestHandler;
  optionalAuth: RequestHandler;
}

export const buildRoutes = ({
  repos,
  provider,
  authAdmin,
  avatars,
  communityImages,
  requireAuth,
  optionalAuth,
}: Deps): Router => {
  const router = Router();

  const games = createGamesService(
    repos.games,
    provider,
    async (userId) => {
      const row = await repos.profiles.findById(userId);
      return { showSexualContent: row?.show_sexual_content ?? false };
    },
    repos.gameEvents,
  );
  // A profile background is a picture from a game its owner has logged.
  const backdrops = {
    backdrops: (gameId: number) => games.backdrops(gameId),
    hasLogged: async (userId: string, gameId: number) =>
      (await repos.gameLogs.listByUserAndGame(userId, gameId)).length > 0,
  };
  const profiles = createProfilesService(
    repos.profiles,
    authAdmin,
    avatars,
    repos.accountExport,
    {
      ...backdrops,
      owns: async (userId, url) =>
        (await repos.progress.ownedBackgrounds(userId)).some(
          (b) => b.url === url,
        ),
    },
    async (a, b) => (await repos.friends.find(a, b))?.status === "accepted",
  );
  const profileGate = createProfileGate(repos.profiles, repos.friends);
  const favourites = createFavouritesService(
    repos.favourites,
    repos.games,
    profileGate,
    repos.gameLogs,
  );
  // Reactions open with level and packs, which progress knows; asked at
  // request time, by when it exists.
  const reactionsFor = (userId: string) => progress.reactionsFor(userId);
  const lists = createListsService(
    repos.lists,
    repos.games,
    repos.friends,
    repos.notifications,
    profileGate,
    reactionsFor,
  );
  const gaming25 = createGaming25Service(
    repos.gaming25,
    repos.games,
    repos.profiles,
    repos.notifications,
    profileGate,
  );
  const progress = createProgressService(
    repos.progress,
    repos.profiles,
    repos.friends,
    repos.lists,
    repos.notifications,
    backdrops,
    async (id) => (await repos.reviews.findById(id))?.user_id ?? null,
  );
  const gameLogs = createGameLogsService(
    repos.gameLogs,
    repos.games,
    repos.reviews,
    profileGate,
  );
  const reviews = createReviewsService(
    repos.reviews,
    repos.profiles,
    repos.games,
    repos.gameLogs,
    repos.notifications,
    profileGate,
    repos.friends,
    reactionsFor,
  );
  const friends = createFriendsService(
    repos.friends,
    repos.profiles,
    repos.notifications,
    profileGate,
  );
  const notifications = createNotificationsService(
    repos.notifications,
    repos.friends,
  );

  const community = createCommunityService(
    repos.community,
    repos.profiles,
    repos.games,
    communityImages,
    repos.notifications,
    profileGate,
    reactionsFor,
  );

  const reports = createReportsService({
    repo: repos.reports,
    community: repos.community,
    communityService: community,
    reviews: repos.reviews,
    profiles: repos.profiles,
    lists: repos.lists,
    avatars,
  });

  const admin = createAdminService({
    repo: repos.admin,
    games: repos.games,
    gamesService: games,
    notifications: repos.notifications,
    provider,
  });

  // Under /api so the host's rewrites reach it; the root one does not.
  router.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // The one gate for the whole admin API: requireAdmin runs before every
  // route in the router, so a new admin route cannot skip it.
  router.use(
    "/admin",
    requireAuth,
    requireAdmin(repos.profiles),
    Router().use("/reports", createAdminReportsRouter({ service: reports })),
    createAdminRouter({ service: admin }),
  );

  router.use(
    "/reports",
    createReportsRouter({ service: reports, requireAuth }),
  );

  router.use("/platforms", createPlatformsRouter(repos.platforms));
  router.use("/genres", createGenresRouter(repos.genres));
  router.use(
    "/stats",
    createStatsRouter(repos.profiles, repos.games, repos.gameLogs),
  );

  router.use(
    "/profiles",
    createProfilesRouter({ service: profiles, requireAuth, optionalAuth }),
  );

  // "me" routes are grouped so the acting user always comes from the token
  router.use(
    "/me/game-logs",
    createMyGameLogsRouter({ service: gameLogs, requireAuth, optionalAuth }),
  );
  router.use(
    "/me/logs",
    createMyLogsRouter({
      service: gameLogs,
      reviews,
      requireAuth,
      optionalAuth,
    }),
  );
  router.use(
    "/me/wishlist",
    createMyWishlistRouter({ service: gameLogs, requireAuth, optionalAuth }),
  );
  router.use(
    "/me/shelf",
    createMyShelfRouter({ service: gameLogs, requireAuth, optionalAuth }),
  );
  router.use(
    "/me/reviews",
    createMyReviewsRouter({ service: reviews, requireAuth, optionalAuth }),
  );
  router.use(
    "/me/favourites",
    createMyFavouritesRouter({
      service: favourites,
      requireAuth,
      optionalAuth,
    }),
  );
  router.use(
    "/me/lists",
    createMyListsRouter({ service: lists, requireAuth, optionalAuth }),
  );
  router.use(
    "/me/gaming-25",
    createMyGaming25Router({ service: gaming25, requireAuth, optionalAuth }),
  );
  router.use(
    "/me",
    createMyProgressRouter({ service: progress, requireAuth, optionalAuth }),
  );
  router.use(
    "/me/friends",
    createMyFriendsRouter({ service: friends, requireAuth, optionalAuth }),
  );
  router.use(
    "/me/notifications",
    createMyNotificationsRouter({ service: notifications, requireAuth }),
  );

  // per-user public views, addressed by username
  router.use(
    "/users/:username/game-logs",
    createUserGameLogsRouter({ service: gameLogs, requireAuth, optionalAuth }),
  );
  router.use(
    "/users/:username/wishlist",
    createUserWishlistRouter({ service: gameLogs, requireAuth, optionalAuth }),
  );
  router.use(
    "/users/:username/shelf",
    createUserShelfRouter({ service: gameLogs, requireAuth, optionalAuth }),
  );
  router.use(
    "/users/:username/logs",
    createUserLogsRouter({ service: gameLogs, requireAuth, optionalAuth }),
  );
  router.use(
    "/users/:username/stats",
    createUserStatsRouter({ service: gameLogs, requireAuth, optionalAuth }),
  );
  router.use(
    "/users/:username/reviews",
    createUserReviewsRouter({ service: reviews, requireAuth, optionalAuth }),
  );
  router.use(
    "/users/:username/friends",
    createUserFriendsRouter({ service: friends, requireAuth, optionalAuth }),
  );
  router.use(
    "/users/:username/favourites",
    createUserFavouritesRouter({
      service: favourites,
      requireAuth,
      optionalAuth,
    }),
  );

  router.use(
    "/users/:username/lists",
    createUserListsRouter({ service: lists, requireAuth, optionalAuth }),
  );
  router.use(
    "/lists",
    createListsRouter({ service: lists, profiles: repos.profiles, requireAuth, optionalAuth }),
  );

  router.use(
    "/users/:username/gaming-25",
    createUserGaming25Router({ service: gaming25, requireAuth, optionalAuth }),
  );
  router.use(
    "/progress",
    createProgressRouter({ service: progress, requireAuth, optionalAuth }),
  );
  router.use(
    "/shop",
    createShopRouter({ service: progress, requireAuth, optionalAuth }),
  );
  router.use(
    "/referrals",
    createReferralsRouter({ service: progress, requireAuth, optionalAuth }),
  );
  router.use(
    "/gaming-25",
    createGaming25Router({ service: gaming25, requireAuth, optionalAuth }),
  );

  router.use(
    "/community",
    createCommunityRouter({ service: community, requireAuth, optionalAuth }),
  );

  router.use(
    "/reviews",
    createReviewsFeedRouter({ service: reviews, requireAuth, optionalAuth }),
  );

  router.use(
    "/games/:gameId/lists",
    createGameListsRouter({ service: lists, requireAuth, optionalAuth }),
  );
  router.use(
    "/games/:gameId/reviews",
    createGameReviewsRouter({ service: reviews, requireAuth, optionalAuth }),
  );
  router.use(
    "/games",
    createGamesRouter({ service: games, requireAuth, optionalAuth }),
  );

  router.use(
    "/cron",
    createCronRouter({
      provider,
      repo: repos.games,
      progress,
      secret: env().CRON_SECRET,
    }),
  );

  return router;
};
