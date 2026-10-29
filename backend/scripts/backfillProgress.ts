/**
 * Evaluates progress for every member, so levels, XP and badges are right
 * on profiles before their owners next visit. For the deploy that brings
 * progress live; safe to run again, and it leaves every launch reveal for
 * its member to see.
 *
 *   npm run backfill:progress -w backend            # says where it would run
 *   npm run backfill:progress -w backend -- --yes   # runs it
 *
 * It runs against whatever SUPABASE_URL is set: backend/.env, unless the
 * environment says otherwise.
 */
// side-effect import: must come first so .env is loaded before env() runs
import "../src/config/loadEnv.js";
import { env } from "../src/config/env.js";
import { supabase } from "../src/config/supabase.js";
import { createLogger } from "../src/lib/logger.js";
import { createRepositories } from "../src/repositories.js";
import { backfillProgress } from "../src/modules/progress/progress.backfill.js";
import { createProgressService } from "../src/modules/progress/progress.service.js";

const main = async () => {
  const logger = createLogger();
  const host = new URL(env().SUPABASE_URL).host;
  if (!process.argv.includes("--yes")) {
    logger.info(
      { host },
      "would evaluate progress for every member here; run with --yes to do it",
    );
    return;
  }

  const repos = createRepositories(supabase());
  const service = createProgressService(
    repos.progress,
    repos.profiles,
    repos.friends,
    repos.lists,
    repos.notifications,
    // Evaluating never buys a background or pins a review.
    {
      backdrops: async () => [],
      hasLogged: async () => false,
    },
    async () => null,
  );

  logger.info({ host }, "evaluating progress for every member");
  const result = await backfillProgress(
    {
      ids: (after, limit) => repos.progress.profileIds(after, limit),
      evaluate: (id) => service.evaluate(id),
    },
    {
      onError: (userId, error) =>
        logger.error({ userId, err: error }, "could not evaluate"),
    },
  );
  logger.info(
    { evaluated: result.evaluated, failed: result.failed.length },
    "done",
  );
  if (result.failed.length > 0) process.exitCode = 1;
};

main().catch((error) => {
  createLogger().error({ err: error }, "backfill failed");
  process.exit(1);
});
