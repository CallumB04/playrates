/**
 * Copies a slice of the live catalogue for the local database to start from.
 *
 *   npm run local:snapshot
 *
 * Read-only against live: selects, never writes. Takes the most widely known
 * games (and whatever is trending), with their platforms, consoles and
 * genres, and writes them to supabase/seed/catalogue.json. No people: every
 * account, log and review locally is made up by buildSeed.ts.
 *
 * The local stack resets from this file every time it starts, so it only
 * needs taking again for newer games.
 */
import "../../src/config/loadEnv.js";
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { supabase } from "../../src/config/supabase.js";

const GAMES = 3000;
// PostgREST stops at 1000 rows a request.
const PAGE = 1000;

const out = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../supabase/seed/catalogue.json",
);

type Row = Record<string, unknown>;

const db = supabase();

const pages = async (
  query: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: Row[] | null; error: unknown }>,
  limit = Infinity,
): Promise<Row[]> => {
  const rows: Row[] = [];
  for (let from = 0; rows.length < limit; from += PAGE) {
    const { data, error } = await query(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if ((data ?? []).length < PAGE) break;
  }
  return rows.slice(0, limit);
};

const inBatches = async (table: string, ids: number[]): Promise<Row[]> => {
  const rows: Row[] = [];
  for (let i = 0; i < ids.length; i += 300) {
    const batch = ids.slice(i, i + 300);
    rows.push(
      ...(await pages((from, to) =>
        db.from(table).select("*").in("game_id", batch).range(from, to),
      )),
    );
  }
  return rows;
};

const main = async () => {
  const known = await pages(
    (from, to) =>
      db
        .from("games")
        .select("*")
        .not("igdb_rating_count", "is", null)
        .order("igdb_rating_count", { ascending: false })
        .order("id")
        .range(from, to),
    GAMES,
  );
  const trending = await pages((from, to) =>
    db
      .from("games")
      .select("*")
      .eq("is_trending", true)
      .order("id")
      .range(from, to),
  );

  const games = [
    ...new Map([...known, ...trending].map((g) => [g.id, g])).values(),
  ];
  const ids = games.map((g) => g.id as number);

  const [platforms, platformSystems, genres] = await Promise.all(
    ["platforms", "platform_systems", "genres"].map((table) =>
      pages((from, to) => db.from(table).select("*").range(from, to)),
    ),
  );

  const snapshot = {
    takenAt: new Date().toISOString(),
    platforms,
    platformSystems,
    genres,
    games,
    gamePlatforms: await inBatches("game_platforms", ids),
    gameSystems: await inBatches("game_systems", ids),
    gameGenres: await inBatches("game_genres", ids),
  };

  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, JSON.stringify(snapshot));
  console.log(`wrote ${games.length} games to ${out}`);
};

await main();
