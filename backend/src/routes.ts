import { Router, type RequestHandler } from "express";
import type { Repositories } from "./repositories.js";
import type { AuthAdmin } from "./config/authAdmin.js";
import type { AvatarStore } from "./config/avatarStore.js";
import type { CommunityImageStore } from "./config/communityImageStore.js";
import type { GamesProvider } from "./providers/games/GamesProvider.js";
import { createProfilesService } from "./modules/profiles/profiles.service.js";
import { createProfilesRouter } from "./modules/profiles/profiles.routes.js";
import { createGamesService } from "./modules/games/games.service.js";
import { createGamesRouter } from "./modules/games/games.routes.js";
import { createGameLogsService } from "./modules/game-logs/gameLogs.service.js";
import {
  createMyGameLogsRouter,
  createUserGameLogsRouter,
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
import {
  createCommunityRouter,
  createUserThreadsRouter,
} from "./modules/community/community.routes.js";
import { createPlatformsRouter } from "./modules/platforms/platforms.js";
import { createGenresRouter } from "./modules/genres/genres.js";
import { createStatsRouter } from "./modules/stats/stats.js";

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

  const profiles = createProfilesService(repos.profiles, authAdmin, avatars);
  const games = createGamesService(repos.games, provider, async (userId) => {
    const row = await repos.profiles.findById(userId);
    return { showSexualContent: row?.show_sexual_content ?? false };
  });
  const gameLogs = createGameLogsService(
    repos.gameLogs,
    repos.profiles,
    repos.games,
  );
  const reviews = createReviewsService(
    repos.reviews,
    repos.profiles,
    repos.games,
    repos.gameLogs,
    repos.notifications,
  );
  const friends = createFriendsService(
    repos.friends,
    repos.profiles,
    repos.notifications,
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
  );

  router.use("/platforms", createPlatformsRouter(repos.platforms));
  router.use("/genres", createGenresRouter(repos.genres));
  router.use(
    "/stats",
    createStatsRouter(repos.profiles, repos.games, repos.gameLogs),
  );

  router.use(
    "/profiles",
    createProfilesRouter({ service: profiles, requireAuth }),
  );

  // "me" routes are grouped so the acting user always comes from the token
  router.use(
    "/me/game-logs",
    createMyGameLogsRouter({ service: gameLogs, requireAuth, optionalAuth }),
  );
  router.use(
    "/me/reviews",
    createMyReviewsRouter({ service: reviews, requireAuth, optionalAuth }),
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
    "/users/:username/community-threads",
    createUserThreadsRouter({ service: community, requireAuth, optionalAuth }),
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
    "/games/:gameId/reviews",
    createGameReviewsRouter({ service: reviews, requireAuth, optionalAuth }),
  );
  router.use(
    "/games",
    createGamesRouter({ service: games, requireAuth, optionalAuth }),
  );

  return router;
};
