import { buildApp } from "./app.js";
import { env } from "./config/env.js";
import { supabase } from "./config/supabase.js";
import { createLogger } from "./lib/logger.js";
import { createRepositories } from "./repositories.js";
import { verifySupabaseJwt } from "./middleware/requireAuth.js";
import { nullGamesProvider } from "./providers/games/GamesProvider.js";
import { createRawgProvider } from "./providers/games/rawg/rawg.provider.js";

const logger = createLogger();

const main = () => {
  // parsed here so a bad config fails at boot with a readable message
  const config = env();

  const provider = config.RAWG_API_KEY
    ? createRawgProvider(config.RAWG_API_KEY)
    : nullGamesProvider;

  if (!provider.isConfigured) {
    logger.warn(
      "RAWG_API_KEY is not set - game search will only use the local catalogue",
    );
  }

  const app = buildApp({
    repos: createRepositories(supabase()),
    provider,
    verify: verifySupabaseJwt,
    logger,
  });

  const server = app.listen(config.PORT, () => {
    logger.info(
      { port: config.PORT, env: config.NODE_ENV },
      "PlayRates API listening",
    );
  });

  const shutdown = (signal: string) => {
    logger.info({ signal }, "shutting down");
    server.close(() => process.exit(0));
    // don't hang forever on a stuck connection
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
};

try {
  main();
} catch (error) {
  logger.error({ err: error }, "failed to start");
  process.exit(1);
}
