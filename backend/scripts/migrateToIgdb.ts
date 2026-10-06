/**
 * Moves the catalogue from RAWG to IGDB, one step at a time. Each step is
 * separate and safe to run again.
 *
 *   npm run migrate:igdb -w backend -- --match
 *     For every game someone has logged, reviewed or started a thread on,
 *     finds its IGDB twin and prints the pairs. Writes nothing to the
 *     database; the pairs go to .cache/igdb-matches.json.
 *       --override 123=1942   use IGDB 1942 for our game 123 (repeatable)
 *
 *   npm run migrate:igdb -w backend -- --apply-matches
 *     Writes each matched IGDB game onto our existing row, by our id, so
 *     its logs, reviews and threads stay where they are.
 *
 *   npm run migrate:igdb -w backend -- --purge
 *     Deletes the RAWG games nobody has touched, 5,000 at a time.
 *
 *   npm run migrate:igdb -w backend -- --import [--limit 100000]
 *     Brings IGDB's catalogue in, 500 a request: every game anyone has
 *     rated, most rated first, then IGDB's most visited. Stops at the
 *     limit or when the database reaches 400MB. Upserts, so running it
 *     again after a stop picks up where the catalogue left off.
 *
 *   npm run migrate:igdb -w backend -- --cleanup
 *     Deletes game events about games that no longer exist.
 */
// side-effect import: must come first so .env is loaded before env() runs
import "../src/config/loadEnv.js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../src/config/env.js";
import { supabase } from "../src/config/supabase.js";
import { igdbProviderFromEnv } from "../src/config/igdb.js";
import { createGamesRepository } from "../src/modules/games/games.repository.js";
import type { ExternalGame } from "../src/providers/games/GamesProvider.js";

const MATCHES_FILE = path.join(process.cwd(), ".cache/igdb-matches.json");
const PAGE_SIZE = 500;
const PURGE_BATCH = 5_000;
const STORAGE_CEILING = 400 * 1024 * 1024;
/** How often, in pages, the import checks the database's size. */
const STORAGE_CHECK_EVERY = 10;

interface Match {
  gameId: number;
  title: string;
  year: string | null;
  igdbId: number | null;
  igdbTitle: string | null;
  igdbYear: string | null;
}

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const option = (name: string): string | undefined => {
  const at = args.indexOf(name);
  return at === -1 ? undefined : args[at + 1];
};
const options = (name: string): string[] =>
  args.flatMap((arg, i) => (arg === name && args[i + 1] ? [args[i + 1]!] : []));

const db = supabase();
const igdb = igdbProviderFromEnv(env(), db);
const repo = createGamesRepository(db);

const requireProvider = () => {
  if (!igdb) {
    console.error(
      "IGDB_CLIENT_ID and IGDB_CLIENT_SECRET are not set in backend/.env.",
    );
    process.exit(1);
  }
  return igdb;
};

const normalise = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Our games anyone has done anything with. */
const touchedGames = async (): Promise<
  { id: number; title: string; release_date: string | null; igdb_id: number | null }[]
> => {
  const ids = new Set<number>();
  for (const [table, column] of [
    ["game_logs", "game_id"],
    ["reviews", "game_id"],
    ["community_threads", "game_id"],
  ] as const) {
    const { data, error } = await db.from(table).select(column).not(column, "is", null);
    if (error) throw error;
    for (const row of data ?? []) ids.add((row as Record<string, number>)[column]!);
  }
  if (ids.size === 0) return [];
  const { data, error } = await db
    .from("games")
    .select("id, title, release_date, igdb_id")
    .in("id", [...ids]);
  if (error) throw error;
  return data ?? [];
};

/** The candidate with the same name and year, then the same name, then the
 *  same year, then IGDB's best-known result. */
const pick = (
  title: string,
  year: string | null,
  candidates: ExternalGame[],
): ExternalGame | null => {
  const sameName = (g: ExternalGame) => normalise(g.title) === normalise(title);
  const sameYear = (g: ExternalGame) => year !== null && g.releaseDate?.startsWith(year);
  return (
    candidates.find((g) => sameName(g) && sameYear(g)) ??
    candidates.find(sameName) ??
    candidates.find(sameYear) ??
    candidates[0] ??
    null
  );
};

const match = async () => {
  const provider = requireProvider();
  const overrides = new Map(
    options("--override").map((pair) => {
      const [gameId, igdbId] = pair.split("=").map(Number);
      return [gameId!, igdbId!] as const;
    }),
  );

  const matches: Match[] = [];
  for (const game of await touchedGames()) {
    const year = game.release_date?.slice(0, 4) ?? null;
    const forced = overrides.get(game.id) ?? game.igdb_id;
    const found = forced
      ? await provider.getById(forced)
      : pick(game.title, year, await provider.search(game.title, 10));
    matches.push({
      gameId: game.id,
      title: game.title,
      year,
      igdbId: found?.externalId ?? null,
      igdbTitle: found?.title ?? null,
      igdbYear: found?.releaseDate?.slice(0, 4) ?? null,
    });
  }

  await mkdir(path.dirname(MATCHES_FILE), { recursive: true });
  await writeFile(MATCHES_FILE, JSON.stringify(matches, null, 2));
  console.table(
    matches.map((m) => ({
      ours: `${m.gameId}: ${m.title} (${m.year ?? "?"})`,
      igdb: m.igdbId
        ? `${m.igdbId}: ${m.igdbTitle} (${m.igdbYear ?? "?"})`
        : "NO MATCH",
      check:
        m.igdbTitle && normalise(m.igdbTitle) === normalise(m.title) && m.igdbYear === m.year
          ? ""
          : "<- check",
    })),
  );
  console.log(`Saved to ${MATCHES_FILE}. Fix any with --override <ourId>=<igdbId>.`);
};

const applyMatches = async () => {
  const provider = requireProvider();
  const matches = JSON.parse(await readFile(MATCHES_FILE, "utf8")) as Match[];
  for (const m of matches) {
    if (!m.igdbId) {
      console.warn(`skipped ${m.gameId} (${m.title}): no IGDB match`);
      continue;
    }
    const taken = await repo.findByIgdbId(m.igdbId);
    if (taken && taken.id !== m.gameId) {
      console.warn(`skipped ${m.gameId}: IGDB ${m.igdbId} is already game ${taken.id}`);
      continue;
    }
    const external = await provider.getById(m.igdbId);
    if (!external) {
      console.warn(`skipped ${m.gameId}: IGDB has no game ${m.igdbId}`);
      continue;
    }
    await repo.applyExternal(m.gameId, external);
    console.log(`${m.gameId}: ${m.title} -> ${external.title}`);
  }
};

const purge = async () => {
  let total = 0;
  for (;;) {
    const { data, error } = await db.rpc("purge_unlinked_games", {
      p_limit: PURGE_BATCH,
    });
    if (error) throw error;
    const deleted = Number(data);
    total += deleted;
    console.log(`purged ${total}`);
    if (deleted < PURGE_BATCH) break;
  }
};

const storage = async (): Promise<number> => {
  const { data, error } = await db.rpc("catalogue_storage");
  if (error) throw error;
  return Number(data);
};

const setImporting = async (running: boolean) => {
  const { error } = await db
    .from("admin_settings")
    .upsert({ key: "catalogue_import", value: { running } });
  if (error) throw error;
};

const importCatalogue = async () => {
  const provider = requireProvider();
  const limit = Number(option("--limit") ?? 100_000);
  // Visits count games the rated pass already brought in; each is
  // imported once and counted once.
  const seen = new Set<number>();
  let pages = 0;

  const store = async (games: ExternalGame[]): Promise<boolean> => {
    if (pages++ % STORAGE_CHECK_EVERY === 0) {
      const bytes = await storage();
      console.log(`database is ${Math.round(bytes / 1024 / 1024)}MB`);
      if (bytes >= STORAGE_CEILING) {
        console.warn("stopping: the database has reached 400MB");
        return false;
      }
    }
    const fresh = games
      .filter((g) => !seen.has(g.externalId))
      .slice(0, limit - seen.size);
    await repo.upsertMany(fresh);
    for (const g of fresh) seen.add(g.externalId);
    console.log(`${seen.size} games`);
    return seen.size < limit;
  };

  // Quiet the per-game "added" events while thousands arrive at once.
  await setImporting(true);
  try {
    let going = true;
    console.log("rated games, most rated first");
    for (let page = 1; going; page++) {
      const listing = await provider.listByPopularity(page, PAGE_SIZE);
      going = (await store(listing.games)) && listing.hasNext;
    }
    if (seen.size < limit) {
      console.log("then the most visited");
      going = true;
      for (let page = 1; going; page++) {
        const listing = await provider.listMostVisited(page, PAGE_SIZE);
        going = (await store(listing.games)) && listing.hasNext;
      }
    }
  } finally {
    await setImporting(false);
  }
  console.log(`imported ${seen.size}`);
};

const cleanup = async () => {
  let total = 0;
  for (;;) {
    const { data, error } = await db.rpc("purge_orphan_game_events", {
      p_limit: PURGE_BATCH,
    });
    if (error) throw error;
    total += Number(data);
    if (Number(data) < PURGE_BATCH) break;
  }
  console.log(`removed ${total} events about games that are gone`);
};

const steps: [string, () => Promise<void>][] = [
  ["--match", match],
  ["--apply-matches", applyMatches],
  ["--purge", purge],
  ["--import", importCatalogue],
  ["--cleanup", cleanup],
];

const step = steps.find(([name]) => flag(name));
if (!step) {
  console.error(`Choose a step: ${steps.map(([name]) => name).join(", ")}`);
  process.exit(1);
}

step[1]().catch((error) => {
  console.error(error);
  process.exit(1);
});
