import { createLogger } from "./lib/logger.js";
import { createServerApp } from "./server.js";

const logger = createLogger();

const main = () => {
  const { app, config } = createServerApp();

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
