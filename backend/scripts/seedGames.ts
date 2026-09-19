/**
 * Populates the games table from RAWG.
 *
 *   npm run seed:games -w backend
 *   npm run seed:games -w backend -- "hollow knight" "celeste"
 *
 * Runs through the same provider and repository the API uses, so it exercises
 * the real import path rather than a parallel one. Safe to re-run: games are
 * upserted on rawg_id.
 */
// side-effect import: must come first so .env is loaded before env() runs
import "../src/config/loadEnv.js";
import { env } from "../src/config/env.js";
import { supabase } from "../src/config/supabase.js";
import { createLogger } from "../src/lib/logger.js";
import { createGamesRepository } from "../src/modules/games/games.repository.js";
import { createRawgProvider } from "../src/providers/games/rawg/rawg.provider.js";

/** Reasonable starting catalogue when no terms are given. */
const DEFAULT_TERMS = [
    "the witcher 3",
    "portal 2",
    "elden ring",
    "hollow knight",
    "stardew valley",
    "hades",
    "celeste",
    "red dead redemption 2",
    "disco elysium",
    "outer wilds",
];

const main = async () => {
    const logger = createLogger();
    const config = env();

    if (!config.RAWG_API_KEY) {
        logger.error(
            "RAWG_API_KEY is not set. Add it to backend/.env - get a free key at https://rawg.io/apidocs"
        );
        process.exit(1);
    }

    const terms = process.argv.slice(2);
    const searchTerms = terms.length > 0 ? terms : DEFAULT_TERMS;

    const provider = createRawgProvider(config.RAWG_API_KEY);
    const repo = createGamesRepository(supabase());

    let imported = 0;

    for (const term of searchTerms) {
        logger.info({ term }, "searching RAWG");
        const results = await provider.search(term, 5);

        if (results.length === 0) {
            logger.warn({ term }, "no results");
            continue;
        }

        const ids = await repo.upsertMany(results);
        imported += ids.length;
        logger.info({ term, count: ids.length }, "imported");
    }

    logger.info({ imported }, "seed complete");
};

main().catch((error) => {
    createLogger().error({ err: error }, "seed failed");
    process.exit(1);
});
