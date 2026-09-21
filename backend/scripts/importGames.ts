/**
 * One-off bulk import of the RAWG catalogue.
 *
 *   npm run import:games -w backend
 *   npm run import:games -w backend -- --limit 20000
 *   npm run import:games -w backend -- --from-page 312
 *   npm run import:games -w backend -- --dry-run
 *
 * The free tier allows 20,000 requests against ~900,000 games, so the top
 * 100,000 by tracker count off the listing endpoint costs 2,500. Descriptions
 * aren't in that response and are backfilled when someone opens a game.
 * Resumable via --from-page, so a crash doesn't spend the budget twice.
 */
import "../src/config/loadEnv.js";
import { env } from "../src/config/env.js";
import { supabase } from "../src/config/supabase.js";
import { createLogger } from "../src/lib/logger.js";
import { createGamesRepository } from "../src/modules/games/games.repository.js";
import { createRawgProvider } from "../src/providers/games/rawg/rawg.provider.js";

const PAGE_SIZE = 40;
const DEFAULT_LIMIT = 100_000;

/** Stops a bug or a bad argument from eating the whole allowance. */
const REQUEST_CEILING = 5_000;

// RAWG times out on the odd page, which is near certain over a few thousand.
const MAX_ATTEMPTS = 4;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface Options {
  limit: number;
  fromPage: number;
  dryRun: boolean;
}

const parseArgs = (argv: string[]): Options => {
  const value = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i === -1 ? undefined : argv[i + 1];
  };

  return {
    limit: Number(value("--limit") ?? DEFAULT_LIMIT),
    fromPage: Number(value("--from-page") ?? 1),
    dryRun: argv.includes("--dry-run"),
  };
};

const main = async () => {
  const logger = createLogger();
  const options = parseArgs(process.argv.slice(2));
  const config = env();

  if (!config.RAWG_API_KEY) {
    logger.error("RAWG_API_KEY is not set in backend/.env");
    process.exit(1);
  }

  if (!Number.isFinite(options.limit) || options.limit <= 0) {
    logger.error("--limit must be a positive number");
    process.exit(1);
  }

  const provider = createRawgProvider(config.RAWG_API_KEY);
  const repo = createGamesRepository(supabase());

  const pagesNeeded = Math.ceil(options.limit / PAGE_SIZE);
  const lastPage = options.fromPage + pagesNeeded - 1;

  if (pagesNeeded > REQUEST_CEILING) {
    logger.error(
      { pagesNeeded, ceiling: REQUEST_CEILING },
      "that limit would exceed the request ceiling; raise REQUEST_CEILING deliberately if you mean it",
    );
    process.exit(1);
  }

  logger.info(
    {
      target: options.limit,
      pages: pagesNeeded,
      fromPage: options.fromPage,
      dryRun: options.dryRun,
    },
    "starting import",
  );

  let requests = 0;
  let imported = 0;
  let skipped = 0;
  const startedAt = Date.now();

  for (let page = options.fromPage; page <= lastPage; page++) {
    let result;
    for (let attempt = 1; ; attempt++) {
      try {
        result = await provider.listByPopularity(page, PAGE_SIZE);
        requests++;
        break;
      } catch (error) {
        if (attempt === MAX_ATTEMPTS) {
          // resume from here rather than losing everything already spent
          logger.error(
            { err: error, page, requests, imported },
            `page ${page} failed after ${MAX_ATTEMPTS} attempts — resume with: npm run import:games -w backend -- --from-page ${page}`,
          );
          process.exit(1);
        }
        requests++;
        const backoffMs = 2_000 * 2 ** (attempt - 1);
        logger.warn(
          { page, attempt, backoffMs },
          `page ${page} failed, retrying`,
        );
        await sleep(backoffMs);
      }
    }

    if (result.games.length === 0) {
      logger.info({ page }, "no more results; catalogue exhausted");
      break;
    }

    // no release date and no tracking activity is a placeholder or a duplicate
    const usable = result.games.filter(
      (g) => g.releaseDate !== null || (g.rawgAddedCount ?? 0) > 0,
    );
    skipped += result.games.length - usable.length;

    if (!options.dryRun && usable.length > 0) {
      try {
        await repo.upsertMany(usable);
      } catch (error) {
        logger.error(
          { err: error, page },
          `write failed on page ${page} — resume with --from-page ${page}`,
        );
        process.exit(1);
      }
    }

    imported += usable.length;

    // roughly every thousand games, so the log stays readable on a long run
    if (page % 25 === 0 || page === lastPage) {
      const elapsed = (Date.now() - startedAt) / 1000;
      const rate = imported / Math.max(elapsed, 1);
      const remaining =
        Math.max(0, options.limit - imported) / Math.max(rate, 1);
      logger.info(
        {
          page,
          imported,
          requests,
          skipped,
          perSecond: Math.round(rate),
          etaMinutes: Math.round(remaining / 60),
        },
        "progress",
      );
    }

    if (!result.hasNext) {
      logger.info({ page }, "reached the end of the catalogue");
      break;
    }
  }

  logger.info(
    {
      imported,
      skipped,
      requestsUsed: requests,
      minutes: Math.round((Date.now() - startedAt) / 60000),
    },
    options.dryRun ? "dry run complete" : "import complete",
  );
};

main().catch((error) => {
  createLogger().error({ err: error }, "import failed");
  process.exit(1);
});
