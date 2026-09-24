/**
 * One-off backfill of portrait box art across the whole catalogue.
 *
 *   npm run backfill:boxart -w backend
 *   npm run backfill:boxart -w backend -- --dry-run --limit 2000
 *   npm run backfill:boxart -w backend -- --authoritative 0
 *   npm run backfill:boxart -w backend -- --from-id 48000
 *   npm run backfill:boxart -w backend -- --refresh-index
 *
 * A game's box art normally arrives on its first detail view, off the Steam
 * link RAWG hands back. Doing that for 130,000 games would cost 130,000 RAWG
 * requests against a 20,000/month allowance, so the bulk pass recovers the app
 * id another way: the games RAWG already told us are on Steam, matched by name
 * against an index of Steam's catalogue, then a HEAD per candidate.
 *
 * Name matching is the weaker signal, so it is deliberately timid — a game
 * RAWG does not place on Steam is never considered, and any name two apps
 * share is skipped rather than guessed at. Those games still get the right
 * cover from the per-view lookup, which overwrites whatever this wrote.
 *
 * What it cannot tell apart is a game and the remake that took its name:
 * "DOOM" the 1993 game matches "DOOM" the 2016 one, and nothing free says
 * which of them a Steam app is. Those are the famous titles, so the most
 * tracked games get their app id from RAWG itself first — a request each,
 * which is why it is a few thousand of them and not all sixty thousand.
 *
 * Resumable via --from-id, and the Steam index is cached, so a crash costs
 * minutes rather than the whole run.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import "../src/config/loadEnv.js";
import { env } from "../src/config/env.js";
import { supabase } from "../src/config/supabase.js";
import { createLogger } from "../src/lib/logger.js";
import {
  indexByTitle,
  normaliseTitle,
  steamAppId,
  steamBoxArtUrl,
  type SteamApp,
  type StoreLinksResponse,
} from "../src/providers/games/rawg/steamBoxArt.js";

/* SteamSpy's catalogue dump, 1,000 apps a page ordered by owners. Valve's own
   GetAppList stopped serving anonymous callers, and this is the only bulk
   appid-to-name source left that does not want a key. */
const STEAM_INDEX_URL = (page: number) =>
  `https://steamspy.com/api.php?request=all&page=${page}`;

const INDEX_CACHE = resolve(import.meta.dirname, "../.cache/steam-apps.json");
/* It runs out somewhere in the high eighties; the ceiling only stops a change
   at their end turning into an unbounded loop. */
const MAX_INDEX_PAGES = 120;

/* SteamSpy answers "Too many connections" under load, several pages in a row,
   so pace it and treat a failure as worth waiting out rather than fatal. */
const INDEX_PAGE_GAP_MS = 1_500;
const INDEX_ATTEMPTS = 5;

const GAME_PAGE_SIZE = 1_000;
/* RAWG allows 20,000 requests a month and this spends one per game, so it
   buys accuracy only where it is worth most: the games people browse. */
const DEFAULT_AUTHORITATIVE = 2_000;
const RAWG_GAP_MS = 120;
const HEAD_TIMEOUT_MS = 8_000;
/* Plain CDN reads, and most of them miss; the misses are slow enough that a
   timid setting turns the catalogue into a six-hour walk. */
const DEFAULT_CONCURRENCY = 32;
/* Above this share of a page going unanswered, assume it is us, not Steam. */
const UNKNOWN_LIMIT = 0.2;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Options {
  authoritative: number;
  limit: number;
  fromId: number;
  concurrency: number;
  dryRun: boolean;
  refreshIndex: boolean;
}

const parseArgs = (argv: string[]): Options => {
  const value = (flag: string) => {
    const i = argv.indexOf(flag);
    return i === -1 ? undefined : argv[i + 1];
  };
  return {
    authoritative: Number(value("--authoritative") ?? DEFAULT_AUTHORITATIVE),
    limit: Number(value("--limit") ?? Number.POSITIVE_INFINITY),
    fromId: Number(value("--from-id") ?? 0),
    concurrency: Number(value("--concurrency") ?? DEFAULT_CONCURRENCY),
    dryRun: argv.includes("--dry-run"),
    refreshIndex: argv.includes("--refresh-index"),
  };
};

type Logger = ReturnType<typeof createLogger>;

interface SteamSpyRow {
  appid?: number;
  name?: string;
}

/** Every Steam app SteamSpy knows, cached: the slow half of the run. */
const fetchSteamApps = async (logger: Logger): Promise<SteamApp[]> => {
  const apps: SteamApp[] = [];

  for (let page = 0; page < MAX_INDEX_PAGES; page++) {
    let rows: Record<string, SteamSpyRow> | null = null;

    for (let attempt = 1; attempt <= INDEX_ATTEMPTS; attempt++) {
      try {
        const response = await fetch(STEAM_INDEX_URL(page));
        const body = await response.text();
        rows = JSON.parse(body) as Record<string, SteamSpyRow>;
        break;
      } catch (error) {
        /* Giving up on a page would look exactly like reaching the end of
           the list, and a half-built index would then be cached as if it
           were the whole of Steam. */
        if (attempt === INDEX_ATTEMPTS) {
          throw new Error(
            `steam index page ${page} failed after ${INDEX_ATTEMPTS} attempts`,
            { cause: error },
          );
        }
        await sleep(5_000 * attempt);
      }
    }

    if (!rows || Object.keys(rows).length === 0) {
      logger.info({ page, apps: apps.length }, "steam index complete");
      break;
    }

    for (const row of Object.values(rows)) {
      if (row.appid && row.name) {
        apps.push({ appId: String(row.appid), name: row.name });
      }
    }

    if (page % 10 === 0) {
      logger.info({ page, apps: apps.length }, "building steam index");
    }
    await sleep(INDEX_PAGE_GAP_MS);
  }

  return apps;
};

const loadSteamApps = async (
  logger: Logger,
  refresh: boolean,
): Promise<SteamApp[]> => {
  if (!refresh) {
    try {
      const cached = JSON.parse(
        await readFile(INDEX_CACHE, "utf8"),
      ) as SteamApp[];
      logger.info({ apps: cached.length }, "steam index read from cache");
      return cached;
    } catch {
      // no cache yet, or it was written by an older shape of this script
    }
  }

  const apps = await fetchSteamApps(logger);
  await mkdir(dirname(INDEX_CACHE), { recursive: true });
  await writeFile(INDEX_CACHE, JSON.stringify(apps));
  return apps;
};

/**
 * Whether Steam actually serves the art.
 *
 * "Could not tell" is kept apart from "there is none": under throttling or a
 * network fault every lookup fails, and counting those as absence would walk
 * the whole catalogue writing nothing while reporting success.
 */
type ArtCheck = "yes" | "no" | "unknown";

const hasArt = async (url: string): Promise<ArtCheck> => {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetch(url, {
        method: "HEAD",
        signal: AbortSignal.timeout(HEAD_TIMEOUT_MS),
      });
      if (response.ok) return "yes";
      if (response.status === 404) return "no";
    } catch {
      // timed out or the connection went; worth one more try
    }
    if (attempt === 1) await sleep(500);
  }
  return "unknown";
};

/**
 * Runs `worker` over `items`, `limit` of them in flight.
 *
 * A sliding window rather than fixed batches: one slow miss in a batch of
 * thirty-two otherwise holds up the thirty-one that already came back, which
 * measured at roughly half the throughput.
 */
const inPool = async <T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> => {
  const results: R[] = new Array<R>(items.length);
  let next = 0;

  const run = async (): Promise<void> => {
    for (let i = next++; i < items.length; i = next++) {
      results[i] = await worker(items[i]!);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, run),
  );
  return results;
};

/**
 * Every game RAWG places on Steam, read once.
 *
 * Joining this per page instead cost enough that Postgres cancelled the
 * query partway through a run: the join got dearer as the rows it had to
 * look past filled in.
 */
const steamGameIds = async (
  db: ReturnType<typeof supabase>,
  logger: Logger,
): Promise<Set<number>> => {
  const ids = new Set<number>();
  let lastId = 0;

  for (;;) {
    const { data, error } = await db
      .from("game_platforms")
      .select("game_id")
      .eq("platform_slug", "steam")
      .gt("game_id", lastId)
      .order("game_id", { ascending: true })
      .limit(GAME_PAGE_SIZE);

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;

    for (const row of data) ids.add(row.game_id as number);
    lastId = data.at(-1)!.game_id as number;
  }

  logger.info({ games: ids.size }, "steam games listed");
  return ids;
};

/**
 * App ids straight from RAWG for the most tracked games, keyed by game id.
 * One request each, so it is deliberately a small head of the catalogue.
 */
const authoritativeAppIds = async (
  db: ReturnType<typeof supabase>,
  logger: Logger,
  onSteam: Set<number>,
  count: number,
  key: string,
): Promise<Map<number, string>> => {
  const ids = new Map<number, string>();
  if (count <= 0) return ids;

  /* Asked for wide and narrowed here: a URL naming all sixty thousand Steam
     games is longer than PostgREST will accept. */
  const { data, error } = await db
    .from("games")
    .select("id, rawg_id")
    .is("box_art_url", null)
    .not("rawg_id", "is", null)
    .order("rawg_added_count", { ascending: false, nullsFirst: false })
    .limit(count * 3);

  if (error) throw new Error(error.message);

  const wanted = (data ?? [])
    .filter((game) => onSteam.has(game.id as number))
    .slice(0, count);

  for (const [i, game] of wanted.entries()) {
    try {
      const response = await fetch(
        `https://api.rawg.io/api/games/${game.rawg_id as number}/stores?key=${key}`,
      );
      const appId = steamAppId(
        (await response.json()) as StoreLinksResponse,
      );
      if (appId) ids.set(game.id as number, appId);
    } catch {
      // one game losing its authoritative id just falls back to the name
    }
    if (i % 250 === 0) {
      logger.info(
        { asked: i, of: wanted.length, found: ids.size },
        "asking rawg for app ids",
      );
    }
    await sleep(RAWG_GAP_MS);
  }

  return ids;
};

const main = async () => {
  const logger = createLogger();
  const options = parseArgs(process.argv.slice(2));
  const db = supabase();

  const index = indexByTitle(await loadSteamApps(logger, options.refreshIndex));
  logger.info(
    { names: index.size, concurrency: options.concurrency },
    "steam index ready",
  );

  const rawgKey = env().RAWG_API_KEY;
  if (options.authoritative > 0 && !rawgKey) {
    logger.error(
      "RAWG_API_KEY is not set — rerun with --authoritative 0 to match on name alone",
    );
    process.exit(1);
  }

  const onSteam = await steamGameIds(db, logger);

  const authoritative = await authoritativeAppIds(
    db,
    logger,
    onSteam,
    rawgKey ? options.authoritative : 0,
    rawgKey ?? "",
  );
  logger.info({ appIds: authoritative.size }, "rawg app ids ready");

  let lastId = options.fromId;
  let scanned = 0;
  let matched = 0;
  let written = 0;
  let noArt = 0;
  let unresolved = 0;
  const samples: string[] = [];
  const startedAt = Date.now();

  for (;;) {
    const { data: games, error } = await db
      .from("games")
      .select("id, title")
      .is("box_art_url", null)
      .gt("id", lastId)
      .order("id", { ascending: true })
      .limit(Math.min(GAME_PAGE_SIZE, options.limit - scanned));

    if (error) {
      logger.error(
        { err: error, lastId },
        `read failed — resume with --from-id ${lastId}`,
      );
      process.exit(1);
    }
    if (!games || games.length === 0) break;

    lastId = games.at(-1)!.id as number;
    scanned += games.length;

    /* RAWG's own store data, already imported as the "steam" platform
       family, says whether the game is on Steam at all. Matching names
       without it would hand a console-only game the cover of the modern
       remake that took its name. */
    const candidates = games.flatMap((game) => {
      if (!onSteam.has(game.id as number)) return [];
      const appId =
        authoritative.get(game.id as number) ??
        index.get(normaliseTitle(game.title as string));
      return appId
        ? [{ id: game.id as number, title: game.title as string, appId }]
        : [];
    });
    matched += candidates.length;

    const checked = await inPool(
      candidates,
      options.concurrency,
      async (candidate) => {
        const url = steamBoxArtUrl(candidate.appId);
        return { ...candidate, url, art: await hasArt(url) };
      },
    );

    const found = checked.filter((hit) => hit.art === "yes");
    const unknown = checked.filter((hit) => hit.art === "unknown").length;
    noArt += checked.filter((hit) => hit.art === "no").length;
    unresolved += unknown;

    /* Steam pushing back looks like every game lacking art, so stop rather
       than march through the catalogue recording nothing. */
    if (checked.length > 0 && unknown > checked.length * UNKNOWN_LIMIT) {
      logger.error(
        { unknown, checked: checked.length, lastId },
        `too many lookups went unanswered — wait, then resume with --from-id ${lastId}`,
      );
      process.exit(1);
    }

    if (samples.length < 25) {
      samples.push(...found.slice(0, 5).map((hit) => `${hit.title} → ${hit.appId}`));
    }

    if (!options.dryRun && found.length > 0) {
      const writes = await inPool(found, options.concurrency, async (hit) =>
        db.from("games").update({ box_art_url: hit.url }).eq("id", hit.id),
      );
      const failed = writes.filter((write) => write.error);
      if (failed.length > 0) {
        logger.error(
          { err: failed[0]?.error, lastId },
          `write failed — resume with --from-id ${lastId}`,
        );
        process.exit(1);
      }
    }
    written += found.length;

    const elapsed = (Date.now() - startedAt) / 1000;
    logger.info(
      {
        lastId,
        scanned,
        matched,
        written,
        noArt,
        unresolved,
        perSecond: Math.round(scanned / Math.max(elapsed, 1)),
      },
      "progress",
    );

    if (scanned >= options.limit) break;
  }

  logger.info(
    {
      scanned,
      matched,
      written,
      noArt,
      unresolved,
      unmatched: scanned - matched,
      minutes: Math.round((Date.now() - startedAt) / 60000),
      samples: samples.slice(0, 25),
    },
    options.dryRun ? "dry run complete" : "backfill complete",
  );
};

main().catch((error) => {
  createLogger().error({ err: error }, "backfill failed");
  process.exit(1);
});
