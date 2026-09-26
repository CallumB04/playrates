// side-effect import: must come first so .env is loaded before env() runs
import "./config/loadEnv.js";
import type { Express } from "express";
import { buildApp } from "./app.js";
import { env, type Env } from "./config/env.js";
import { supabase } from "./config/supabase.js";
import { createAuthAdmin } from "./config/authAdmin.js";
import { createAvatarStore } from "./config/avatarStore.js";
import { createCommunityImageStore } from "./config/communityImageStore.js";
import { createLogger, type Logger } from "./lib/logger.js";
import { createRepositories } from "./repositories.js";
import { verifySupabaseJwt } from "./middleware/requireAuth.js";
import { nullGamesProvider } from "./providers/games/GamesProvider.js";
import { createRawgProvider } from "./providers/games/rawg/rawg.provider.js";

export interface ServerApp {
  app: Express;
  config: Env;
  logger: Logger;
}

/**
 * Everything wired together, with no opinion about how it gets served. The
 * long-running process listens on it; the serverless function hands it each
 * request instead.
 */
export const createServerApp = (): ServerApp => {
  // parsed here so a bad config fails at boot with a readable message
  const config = env();
  const logger = createLogger();

  const provider = config.RAWG_API_KEY
    ? createRawgProvider(config.RAWG_API_KEY)
    : nullGamesProvider;

  if (!provider.isConfigured) {
    logger.warn(
      "RAWG_API_KEY is not set - game search will only use the local catalogue",
    );
  }

  const db = supabase();

  return {
    config,
    logger,
    app: buildApp({
      repos: createRepositories(db),
      provider,
      authAdmin: createAuthAdmin(db),
      avatars: createAvatarStore(db),
      communityImages: createCommunityImageStore(db),
      verify: verifySupabaseJwt,
      logger,
    }),
  };
};
