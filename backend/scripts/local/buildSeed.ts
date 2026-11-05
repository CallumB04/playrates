/**
 * Writes the SQL the local database starts from on every reset.
 *
 *   npm run local:seed      (run for you by npm run dev:local)
 *
 * From supabase/seed/catalogue.json (see snapshot.ts) it writes:
 *   10_catalogue.sql  the games, their platforms, consoles and genres
 *   20_world.sql      a made-up community using them: accounts, logs on one
 *                     or more consoles, reviews, votes, friendships, threads,
 *                     patch notes, lists, Gaming 25s, favourites, notifications,
 *                     reports, an announcement and the email log
 *
 * Random, but seeded, so every reset produces the same world. Dates are
 * relative to when it runs, so the world is always current: someone online
 * a few minutes ago, a year chart with this year's months in it.
 *
 * The accounts and their password are in docs/local-development.md.
 */
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  GAMING_25_CATEGORIES,
  GAMING_25_CENTRE,
  GAMING_25_SIZE,
  REACTION_KEYS,
  patchNoteDoc,
  type PatchNote,
} from "@playrates/shared";
import { seedGame } from "./catalogueRows.js";
import {
  COMMUNITY,
  OPENING_POSTS,
  REPLIES,
  THREAD_TITLES,
  reviewBody,
  type Person,
} from "./content.js";

const seedDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../supabase/seed",
);

/** Local only: these accounts exist nowhere else. */
export const LOCAL_PASSWORD = "playrates-local";

type Row = Record<string, unknown>;

interface Catalogue {
  platforms: Row[];
  platformSystems: Row[];
  genres: Row[];
  games: Row[];
  gamePlatforms: Row[];
  gameSystems: { game_id: number; system_slug: string }[];
  gameGenres: Row[];
}

// --- randomness, seeded -----------------------------------------------------

const mulberry32 = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const r = mulberry32(20261008);
const int = (min: number, max: number) =>
  min + Math.floor(r() * (max - min + 1));
const chance = (p: number) => r() < p;
const pick = <T>(xs: readonly T[]): T => xs[Math.floor(r() * xs.length)]!;
/** Mostly upvotes, as on the site, with the reactions anyone can leave
 *  mixed in. */
const everydayReaction = () =>
  chance(0.65) ? "upvote" : pick(["fire", "love", "lol"] as const);
/** Every kind in turn: enough of them that the bar folds some away. */
const everyReaction = (i: number) => REACTION_KEYS[i % REACTION_KEYS.length]!;
const shuffle = <T>(xs: T[]): T[] => {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
};
const weighted = <T extends string>(weights: Record<T, number>): T => {
  const total = Object.values<number>(weights).reduce((a, b) => a + b, 0);
  let roll = r() * total;
  for (const [key, weight] of Object.entries<number>(weights)) {
    roll -= weight;
    if (roll <= 0) return key as T;
  }
  return Object.keys(weights)[0] as T;
};

// --- time -------------------------------------------------------------------

const NOW = new Date();
const DAY = 86_400_000;
const daysAgo = (days: number) => new Date(NOW.getTime() - days * DAY);
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000);
const later = (d: Date, days: number) =>
  new Date(Math.min(d.getTime() + days * DAY, NOW.getTime()));
const dateOnly = (d: Date) => d.toISOString().slice(0, 10);
/** Days since the start of this year, so a finish can land in it. */
const DAYS_INTO_YEAR = Math.floor(
  (NOW.getTime() - Date.UTC(NOW.getUTCFullYear(), 0, 1)) / DAY,
);

// --- sql --------------------------------------------------------------------

const lit = (v: unknown): string => {
  if (v === null || v === undefined) return "null";
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  if (v instanceof Date) return `'${v.toISOString()}'::timestamptz`;
  if (typeof v === "object") return json(v);
  return `'${String(v).replace(/'/g, "''")}'`;
};
const json = (v: unknown): string => `${lit(JSON.stringify(v))}::jsonb`;

const insert = (table: string, rows: Row[], override = false): string => {
  if (rows.length === 0) return "";
  const columns = Object.keys(rows[0]!);
  const values = rows
    .map((row) => `(${columns.map((c) => lit(row[c])).join(", ")})`)
    .join(",\n");
  return `insert into public.${table} (${columns.join(", ")})${
    override ? " overriding system value" : ""
  }\nvalues\n${values};\n`;
};

/** Whole rows from the snapshot, which already match the table. */
const populate = (table: string, rows: Row[], override = false): string => {
  const out: string[] = [];
  for (let i = 0; i < rows.length; i += 500) {
    out.push(
      `insert into public.${table}${override ? " overriding system value" : ""}
select * from jsonb_populate_recordset(null::public.${table}, $snapshot$${JSON.stringify(
        rows.slice(i, i + 500),
      )}$snapshot$::jsonb)
on conflict do nothing;\n`,
    );
  }
  return out.join("");
};

const doc = (...paragraphs: string[]) => ({
  type: "doc",
  content: paragraphs.map((text) => ({
    type: "paragraph",
    content: [{ type: "text", text }],
  })),
});

// --- the catalogue ----------------------------------------------------------

const catalogueSql = (cat: Catalogue): string => {
  const games = cat.games.map(seedGame);
  return [
    "-- Generated by backend/scripts/local/buildSeed.ts. Do not edit.",
    populate("platforms", cat.platforms),
    populate("platform_systems", cat.platformSystems),
    populate("genres", cat.genres),
    populate("games", games, true),
    "select setval(pg_get_serial_sequence('public.games', 'id'), (select max(id) from public.games));",
    populate("game_platforms", cat.gamePlatforms),
    populate("game_systems", cat.gameSystems),
    populate("game_genres", cat.gameGenres),
  ].join("\n");
};

// --- the world --------------------------------------------------------------

interface Game {
  id: number;
  title: string;
  coverUrl: string | null;
  critic: number | null;
  systems: string[];
  /** A typical length in hours, the same for everyone who plays it. */
  length: number;
}

interface Account {
  id: string;
  username: string;
  firstName: string;
  bio: string;
  timezone: string;
  consoles: string[];
  admin: boolean;
  createdAt: Date;
  lastSeen: Date;
  onboarded: boolean;
  /** How generous their ratings run. */
  bias: number;
}

interface Log {
  id: number;
  user: Account;
  game: Game;
  status: "played" | "playing" | "backlog" | "wishlist";
  ending: "finished" | "mastered" | "shelved" | "retired" | null;
  rating: number | null;
  hoursPlayed: number | null;
  hoursToBeat: number | null;
  start: Date | null;
  finish: Date | null;
  system: string | null;
  family: string | null;
  achievementsTotal: number | null;
  achievementsDone: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const uuid = (n: number) =>
  `00000000-0000-4000-a000-${n.toString(16).padStart(12, "0")}`;

const buildWorld = (cat: Catalogue): string => {
  const familyOf = new Map(
    cat.platformSystems.map((s) => [
      s.slug as string,
      s.platform_slug as string,
    ]),
  );
  const systemsOf = new Map<number, string[]>();
  for (const { game_id, system_slug } of cat.gameSystems) {
    systemsOf.set(game_id, [...(systemsOf.get(game_id) ?? []), system_slug]);
  }
  // Most widely known first, which is the order the snapshot came in.
  const games: Game[] = cat.games
    .filter((g) => (systemsOf.get(g.id as number) ?? []).length > 0)
    .map((g) => ({
      id: g.id as number,
      title: g.title as string,
      coverUrl: (g.box_art_url ?? g.cover_url ?? null) as string | null,
      critic: (g.critic_score as number | null) ?? null,
      systems: systemsOf.get(g.id as number)!,
      length: 6 + (((g.id as number) * 37) % 70),
    }));
  /** Popular games come up far more often, as they would. */
  const popularGame = () => games[Math.floor(games.length * r() ** 2.4)]!;

  // Accounts --------------------------------------------------------------
  let nextUser = 1;
  const account = (
    p: Omit<Person, "consoles"> & { consoles?: string[] },
    extra: Partial<Account> = {},
  ): Account => ({
    id: uuid(nextUser++),
    username: p.username,
    firstName: p.firstName,
    bio: p.bio,
    timezone: p.timezone,
    consoles: p.consoles ?? ["steam"],
    admin: false,
    createdAt: daysAgo(int(60, 540)),
    lastSeen: chance(0.25) ? minutesAgo(int(0, 4)) : daysAgo(r() * 20),
    onboarded: true,
    bias: (r() - 0.5) * 1.4,
    ...extra,
  });

  const tester = account(
    {
      username: "tester",
      firstName: "Callum",
      bio: "The local test account. Logs on several consoles, friends, threads and a few of everything.",
      timezone: "Europe/London",
      consoles: ["playstation5", "nintendo-switch", "steam"],
    },
    {
      admin: true,
      createdAt: daysAgo(400),
      lastSeen: minutesAgo(0),
      bias: 0.2,
    },
  );
  const newbie = account(
    {
      username: "newcomer",
      firstName: "Nova",
      bio: "",
      timezone: "Europe/London",
    },
    { createdAt: minutesAgo(30), lastSeen: minutesAgo(1), onboarded: false },
  );
  const staff = account(
    {
      username: "playrates_team",
      firstName: "PlayRates",
      bio: "Patch notes and announcements from the people who make PlayRates.",
      timezone: "Europe/London",
    },
    { admin: true, createdAt: daysAgo(600) },
  );
  nextUser = 16;
  const community = COMMUNITY.map((p) => account(p));
  const everyone = [tester, newbie, staff, ...community];

  // Logs ------------------------------------------------------------------
  const logs: Log[] = [];
  let nextLog = 1;
  /* game_logs is unique on (user, game, console), a missing console
     included; a log that would break that is left out. */
  const logged = new Set<string>();
  const addLog = (log: Log): Log | null => {
    const key = `${log.user.id}:${log.game.id}:${log.system}`;
    if (logged.has(key)) return null;
    logged.add(key);
    logs.push(log);
    return log;
  };

  const rate = (user: Account, game: Game, shift = 0) => {
    const base =
      (game.critic ?? 74) / 10 + user.bias + shift + (r() - 0.5) * 2.4;
    return Math.min(10, Math.max(0.5, Math.round(base * 2) / 2));
  };

  /** A log as people really fill them in: often without the details. */
  const makeLog = (
    user: Account,
    game: Game,
    system: string | null,
    fixed: Partial<Log> = {},
  ): Log => {
    const status =
      fixed.status ??
      weighted({ played: 55, playing: 12, backlog: 18, wishlist: 15 });
    const ending =
      fixed.ending !== undefined
        ? fixed.ending
        : status === "played"
          ? weighted({
              finished: 45,
              mastered: 10,
              shelved: 15,
              retired: 10,
              none: 20,
            })
          : null;
    const realEnding = (ending === "none" ? null : ending) as Log["ending"];
    const detailed = chance(0.75);

    let start: Date | null = null;
    let finish: Date | null = null;
    let hoursPlayed: number | null = null;
    let hoursToBeat: number | null = null;
    let rating: number | null = null;

    if (status === "played") {
      // Two in five finishes land this year, so the year chart has a shape.
      const finishedAgo = chance(0.4)
        ? int(0, Math.max(1, DAYS_INTO_YEAR))
        : int(DAYS_INTO_YEAR + 1, DAYS_INTO_YEAR + 600);
      finish = daysAgo(finishedAgo);
      start = new Date(finish.getTime() - int(3, 60) * DAY);
      const share =
        realEnding === "mastered"
          ? 1.5 + r() * 1.5
          : realEnding === "shelved" || realEnding === "retired"
            ? 0.1 + r() * 0.5
            : 0.8 + r() * 0.8;
      hoursPlayed = Math.round(game.length * share * 2) / 2;
      if (realEnding === "finished" || realEnding === "mastered") {
        hoursToBeat = chance(0.6)
          ? Math.round(game.length * (0.8 + r() * 0.4) * 2) / 2
          : null;
      }
      rating = chance(0.88)
        ? rate(
            user,
            game,
            realEnding === "shelved" || realEnding === "retired" ? -1.5 : 0,
          )
        : null;
    } else if (status === "playing") {
      start = daysAgo(int(1, 70));
      hoursPlayed = Math.round(game.length * r() * 0.7 * 2) / 2;
      rating = chance(0.4) ? rate(user, game) : null;
    }
    if (!detailed && status !== "playing") {
      start = null;
      finish = null;
      hoursPlayed = null;
      hoursToBeat = null;
    }

    const tracked = status === "played" && chance(0.2);
    const total = tracked ? int(20, 80) : null;
    // A log is written when the run ends, or starts; dates handed in win.
    const createdAt =
      fixed.createdAt ??
      fixed.finish ??
      fixed.start ??
      finish ??
      start ??
      daysAgo(
        int(
          1,
          Math.min(
            500,
            Math.floor((NOW.getTime() - user.createdAt.getTime()) / DAY),
          ),
        ),
      );

    return {
      id: nextLog++,
      user,
      game,
      status,
      ending: realEnding,
      rating,
      hoursPlayed,
      hoursToBeat,
      start,
      finish,
      system,
      family: system ? (familyOf.get(system) ?? null) : null,
      achievementsTotal: total,
      achievementsDone:
        total === null
          ? null
          : realEnding === "mastered"
            ? total
            : Math.floor(total * r() * 0.9),
      createdAt,
      updatedAt: later(createdAt, chance(0.3) ? int(1, 30) : 0),
      ...fixed,
    };
  };

  const consoleFor = (user: Account, game: Game, taken: (string | null)[]) => {
    const free = game.systems.filter((s) => !taken.includes(s));
    const own = user.consoles.filter((s) => free.includes(s));
    if (own.length > 0) return own[0]!;
    return free.length > 0 ? pick(free) : null;
  };

  for (const user of community) {
    const count = int(8, 55);
    const seen = new Set<number>();
    while (seen.size < count) {
      const game = popularGame();
      if (seen.has(game.id)) continue;
      seen.add(game.id);
      // Some logs never named a console, from before the site asked.
      const system = chance(0.07) ? null : consoleFor(user, game, []);
      const log = addLog(makeLog(user, game, system))!;

      // Played again on another console, or bought twice.
      if (
        (log.status === "played" || log.status === "playing") &&
        chance(0.12)
      ) {
        const other = consoleFor(user, game, [log.system]);
        if (other && other !== log.system) {
          addLog(
            makeLog(user, game, other, {
              status: weighted({ played: 50, playing: 30, backlog: 20 }),
            }),
          );
          if (chance(0.2)) {
            const third = consoleFor(user, game, [log.system, other]);
            if (third && third !== other && third !== log.system) {
              addLog(makeLog(user, game, third, { status: "backlog" }));
            }
          }
        }
      }
    }
  }

  // The tester's shelf: every state the log pages have to draw ------------
  const used = new Set<number>();
  const find = (test: (g: Game) => boolean) => {
    const game = games.find((g) => !used.has(g.id) && test(g));
    if (!game)
      throw new Error("no game in the catalogue fits the tester's case");
    used.add(game.id);
    return game;
  };
  const has = (g: Game, ...systems: string[]) =>
    systems.every((s) => g.systems.includes(s));
  const testerLog = (
    game: Game,
    system: string | null,
    fixed: Partial<Log>,
  ) => {
    const log = addLog(makeLog(tester, game, system, fixed));
    if (!log)
      throw new Error(`the tester logged ${game.title} twice on one console`);
    return log;
  };

  // Two consoles, both reviewed: the "Your logs" plate and per-platform reviews.
  const twoConsoles = find((g) => has(g, "playstation5", "nintendo-switch"));
  const twoA = testerLog(twoConsoles, "playstation5", {
    status: "played",
    ending: "finished",
    rating: 9,
    hoursPlayed: 41,
    hoursToBeat: 32,
    start: daysAgo(DAYS_INTO_YEAR - 20),
    finish: daysAgo(DAYS_INTO_YEAR - 45),
  });
  const twoB = testerLog(twoConsoles, "nintendo-switch", {
    status: "playing",
    ending: null,
    rating: 7.5,
    hoursPlayed: 12.5,
    hoursToBeat: 21,
    start: daysAgo(9),
    finish: null,
    updatedAt: daysAgo(1),
  });

  // Three consoles, achievements on one.
  const threeConsoles = find((g) =>
    has(g, "steam", "playstation4", "xbox-one"),
  );
  const threeA = testerLog(threeConsoles, "steam", {
    status: "played",
    ending: "mastered",
    rating: 10,
    hoursPlayed: 96,
    hoursToBeat: 48,
    achievementsTotal: 50,
    achievementsDone: 50,
  });
  testerLog(threeConsoles, "playstation4", {
    status: "played",
    ending: "finished",
    rating: 8.5,
    hoursPlayed: 60,
    hoursToBeat: 45,
  });
  testerLog(threeConsoles, "xbox-one", {
    status: "backlog",
    ending: null,
    rating: null,
    hoursPlayed: null,
    hoursToBeat: null,
    start: null,
    finish: null,
  });

  // A log from before consoles were recorded, beside one that names its own.
  const legacy = find((g) => has(g, "playstation4") && g.systems.length >= 3);
  testerLog(legacy, null, { status: "played", ending: null, rating: 8 });
  testerLog(legacy, "playstation4", {
    status: "played",
    ending: "shelved",
    rating: 6,
  });

  // Every console the game is on is logged, so nothing is left to add.
  const allLogged = find((g) => g.systems.length === 2);
  testerLog(allLogged, allLogged.systems[0]!, {
    status: "played",
    ending: "finished",
    rating: 8,
  });
  testerLog(allLogged, allLogged.systems[1]!, {
    status: "played",
    ending: "retired",
    rating: 5.5,
  });

  // One log, plenty of consoles left: "Played it on another platform?"
  const single = find((g) => has(g, "steam") && g.systems.length >= 4);
  testerLog(single, "steam", {
    status: "played",
    ending: "finished",
    rating: 8.5,
  });

  // A quick add: backlog, no console.
  const quick = find((g) => g.systems.length >= 3);
  testerLog(quick, null, {
    status: "backlog",
    ending: null,
    rating: null,
    hoursPlayed: null,
    hoursToBeat: null,
    start: null,
    finish: null,
  });

  // A full shelf behind them: enough played to page, a few on the go.
  const fill = (status: Log["status"], count: number) => {
    for (let i = 0; i < count; i++) {
      const game = find(() => chance(0.15));
      testerLog(game, consoleFor(tester, game, []), { status });
    }
  };
  fill("played", 34);
  fill("playing", 2);
  fill("backlog", 9);
  fill("wishlist", 8);

  // Reviews ---------------------------------------------------------------
  interface Review {
    id: number;
    log: Log;
    body: string;
    isPublic: boolean;
    spoilers: boolean;
    createdAt: Date;
  }
  const reviews: Review[] = [];
  let nextReview = 1;
  const review = (log: Log, fixed: Partial<Review> = {}) => {
    const r0: Review = {
      id: nextReview++,
      log,
      body: reviewBody(r, log.system),
      isPublic: !chance(0.06),
      spoilers: chance(0.1),
      createdAt: later(log.updatedAt, int(0, 3)),
      ...fixed,
    };
    reviews.push(r0);
    return r0;
  };
  for (const log of logs) {
    if (log.user === tester) continue;
    if (log.status === "played" && log.rating !== null && chance(0.3))
      review(log);
  }
  const testerReviews = [
    review(twoA, { isPublic: true, spoilers: false }),
    review(twoB, {
      body: "The Switch version is the one I keep picking up. It struggles in the busiest fights, but having it in handheld won me over. Late game twist hits just as hard here.",
      spoilers: true,
      isPublic: true,
    }),
    review(threeA, { isPublic: true, spoilers: false }),
  ];
  const testerPlayed = logs.filter(
    (l) =>
      l.user === tester &&
      l.status === "played" &&
      l.rating !== null &&
      l.system,
  );
  for (const log of testerPlayed.slice(6, 12)) review(log);
  review(testerPlayed[12]!, {
    isPublic: false,
    body: "Private note to self: replay this on hard.",
  });

  // Votes: most reviews get a few, the tester's first one a milestone's worth
  // of upvotes. Three reviews of the most reviewed game get every kind of
  // reaction, so its page shows the bar crowded.
  const publicReviews = reviews.filter((rev) => rev.isPublic);
  const reviewsOf = new Map<Game, Review[]>();
  for (const rev of publicReviews)
    reviewsOf.set(rev.log.game, [...(reviewsOf.get(rev.log.game) ?? []), rev]);
  const crowded = new Set(
    [...reviewsOf.values()]
      .sort((a, b) => b.length - a.length)[0]!
      .filter((rev) => rev !== testerReviews[0])
      .slice(0, 3),
  );
  const reviewVotes: Row[] = [];
  for (const rev of publicReviews) {
    const count =
      rev === testerReviews[0]
        ? 12
        : crowded.has(rev)
          ? 30
          : Math.floor(r() ** 3 * 14);
    shuffle(community.filter((u) => u !== rev.log.user))
      .slice(0, count)
      .forEach((voter, i) => {
        reviewVotes.push({
          review_id: rev.id,
          user_id: voter.id,
          reaction:
            rev === testerReviews[0]
              ? "upvote"
              : crowded.has(rev)
                ? everyReaction(i)
                : everydayReaction(),
          created_at: later(rev.createdAt, int(0, 20)),
        });
      });
  }

  // Friendships -----------------------------------------------------------
  const friendships = new Map<string, Row>();
  const befriend = (
    a: Account,
    b: Account,
    status: "accepted" | "pending",
    by: Account,
  ) => {
    const [low, high] = a.id < b.id ? [a, b] : [b, a];
    const key = `${low.id}:${high.id}`;
    if (friendships.has(key) || a === b) return;
    const createdAt = daysAgo(int(5, 300));
    friendships.set(key, {
      user_a_id: low.id,
      user_b_id: high.id,
      status,
      requested_by: by.id,
      created_at: createdAt,
      updated_at:
        status === "accepted" ? later(createdAt, int(0, 4)) : createdAt,
    });
  };
  const [f1, f2, f3, f4, f5, f6, in1, in2, out1] = community;
  for (const friend of [f1!, f2!, f3!, f4!, f5!, f6!])
    befriend(tester, friend, "accepted", friend);
  befriend(in1!, tester, "pending", in1!);
  befriend(in2!, tester, "pending", in2!);
  befriend(tester, out1!, "pending", tester);
  for (const user of community) {
    for (const other of shuffle(community).slice(0, int(2, 7))) {
      befriend(user, other, chance(0.85) ? "accepted" : "pending", user);
    }
  }

  // Friends doing things this week, for the home feed: one of them adding a
  // second console.
  const friendGames = shuffle(games.filter((g) => !used.has(g.id))).slice(0, 5);
  [f1!, f2!, f3!, f4!, f5!].forEach((friend, i) => {
    const game = friendGames[i]!;
    const first = makeLog(friend, game, consoleFor(friend, game, []), {
      status: i % 2 ? "playing" : "played",
      updatedAt: minutesAgo(int(30, 4000)),
    });
    first.createdAt = new Date(
      Math.min(first.createdAt.getTime(), first.updatedAt.getTime()),
    );
    if (!addLog(first)) return;
    if (i === 0) {
      const other = consoleFor(friend, game, [first.system]);
      if (other) {
        addLog(
          makeLog(friend, game, other, {
            status: "playing",
            createdAt: minutesAgo(90),
            updatedAt: minutesAgo(90),
            finish: null,
            start: daysAgo(1),
          }),
        );
      }
    }
  });

  // Community -------------------------------------------------------------
  const threads: Row[] = [];
  const messages: Row[] = [];
  const messageVotes: Row[] = [];
  // A migration makes the patch notes thread and its opening message, so the
  // ids here start clear of them.
  let nextThread = 101;
  let nextMessage = 101;

  const post = (
    threadId: number,
    author: Account,
    body: unknown,
    createdAt: Date,
    opening = false,
    parent: number | null = null,
  ) => {
    const id = nextMessage++;
    messages.push({
      id,
      thread_id: threadId,
      parent_id: parent,
      author_id: author.id,
      body,
      is_opening: opening,
      created_at: createdAt,
    });
    return id;
  };
  const vote = (
    messageId: number,
    voters: Account[],
    after: Date,
    reaction: (i: number) => string = everydayReaction,
  ) => {
    voters.forEach((voter, i) => {
      messageVotes.push({
        message_id: messageId,
        user_id: voter.id,
        reaction: reaction(i),
        created_at: later(after, int(0, 5)),
      });
    });
  };

  const gameThread = (
    author: Account,
    game: Game,
    title: string,
    startedAgo: number,
    repliers: Account[],
  ) => {
    const id = nextThread++;
    const createdAt = daysAgo(startedAgo);
    threads.push({
      id,
      subject_kind: "game",
      game_id: game.id,
      title,
      author_id: author.id,
      created_at: createdAt,
      last_activity_at: createdAt,
    });
    post(id, author, doc(pick(OPENING_POSTS)), createdAt, true);
    const topLevel: { id: number; at: Date; author: Account }[] = [];
    repliers.forEach((replier, i) => {
      const at = later(
        createdAt,
        (startedAgo * (i + 1)) / (repliers.length + 1),
      );
      const parent =
        topLevel.length > 0 && chance(0.35) ? pick(topLevel) : null;
      const messageId = post(
        id,
        replier,
        doc(pick(REPLIES)),
        at,
        false,
        parent?.id ?? null,
      );
      if (!parent) topLevel.push({ id: messageId, at, author: replier });
      vote(
        messageId,
        shuffle(community.filter((u) => u !== replier)).slice(
          0,
          Math.floor(r() ** 2 * 9),
        ),
        at,
      );
    });
    return { id, createdAt, topLevel };
  };

  for (let i = 0; i < 22; i++) {
    const game = popularGame();
    const author = pick(community);
    gameThread(
      author,
      game,
      pick(THREAD_TITLES)(game.title).slice(0, 120),
      int(1, 120),
      shuffle(community.filter((u) => u !== author)).slice(0, int(1, 12)),
    );
  }

  // The tester's own thread, with replies waiting to be read.
  const own = gameThread(
    tester,
    twoConsoles,
    `${twoConsoles.title}: PS5 or Switch?`.slice(0, 120),
    6,
    [f1!, f2!, f3!, f4!, f5!],
  );
  // A message of the tester's in someone else's thread, voted past 5.
  const theirs = gameThread(
    f2!,
    threeConsoles,
    `Is ${threeConsoles.title} worth it in 2026?`.slice(0, 120),
    15,
    [f1!, f3!],
  );
  const testerMessage = post(
    theirs.id,
    tester,
    doc(
      "Played it on three platforms now. PC is the one to get if you can, but the PS4 version is better than its reputation.",
    ),
    daysAgo(12),
  );
  vote(testerMessage, community.slice(10, 17), daysAgo(12), () => "upvote");
  // A reply the tester can react to, with every kind on it already.
  const busyReply = post(
    theirs.id,
    f3!,
    doc(
      "The opening hours are some of the best in the genre. It drags in the middle, but stick with it.",
    ),
    daysAgo(11),
  );
  vote(
    busyReply,
    community.filter((u) => u !== f3!).slice(0, 30),
    daysAgo(11),
    everyReaction,
  );

  // Patch notes: the thread a migration made, signed by the team, with two
  // releases in it, written as the editor writes them.
  const patchStart = daysAgo(90);
  const patchEntries: { at: Date; note: PatchNote }[] = [
    {
      at: daysAgo(30),
      note: {
        title: "v1.0 - Official Launch",
        intro: "PlayRates is open to everyone. Thanks for being here early.",
        items: [
          {
            kind: "feature",
            text: "Log every game you play, with a rating, your hours and how it ended.",
            link: null,
          },
          {
            kind: "improvement",
            text: "Search finds games however you spell them: III or 3, accents or not.",
            link: "/library",
          },
        ],
        outro: null,
      },
    },
    {
      at: daysAgo(2),
      note: {
        title: "v1.1",
        intro: null,
        items: [
          {
            kind: "feature",
            text: "Played something on more than one console? Log each one. Your game page adds up the hours and shows your quickest finish.",
            link: null,
          },
          {
            kind: "feature",
            text: "Lists, and a Gaming 25 for your profile.",
            link: "/me/lists",
          },
          {
            kind: "fix",
            text: "Long platform names stay inside the wishlist on a phone.",
            link: null,
          },
        ],
        outro: "Tell us what you think in the community.",
      },
    },
  ];
  const patchNotesSql = [
    `update public.community_threads set author_id = ${lit(staff.id)}, created_at = ${lit(patchStart)}
where subject_kind = 'patch_notes';`,
    `update public.community_messages m set author_id = ${lit(staff.id)}, created_at = ${lit(patchStart)}
from public.community_threads t where m.thread_id = t.id and t.subject_kind = 'patch_notes' and m.is_opening;`,
    // Every kind of reaction on the opening post.
    `insert into public.community_message_votes (message_id, user_id, reaction, created_at)
select m.id, v.user_id, v.reaction, ${lit(later(patchStart, 2))}
from public.community_messages m
join public.community_threads t on t.id = m.thread_id and t.subject_kind = 'patch_notes'
cross join (values ${community
      .slice(0, 30)
      .map((u, i) => `(${lit(u.id)}::uuid, ${lit(everyReaction(i))})`)
      .join(", ")}) v(user_id, reaction)
where m.is_opening;`,
    ...patchEntries.map(
      (
        entry,
      ) => `insert into public.community_messages (thread_id, author_id, body, patch_note, created_at)
select id, ${lit(staff.id)}, ${json(patchNoteDoc(entry.note))}, ${json(entry.note)}, ${lit(entry.at)}
from public.community_threads where subject_kind = 'patch_notes';`,
    ),
  ].join("\n");

  // Logs as rows ----------------------------------------------------------
  const logRows = logs.map((l) => ({
    id: l.id,
    user_id: l.user.id,
    game_id: l.game.id,
    status: l.status,
    played_status: l.status === "played" ? l.ending : null,
    rating: l.rating,
    hours_played: l.hoursPlayed,
    hours_to_beat: l.hoursToBeat,
    start_date:
      l.start && l.status !== "backlog" && l.status !== "wishlist"
        ? dateOnly(l.start)
        : null,
    finish_date: l.finish && l.status === "played" ? dateOnly(l.finish) : null,
    platform_slug: l.family,
    system_slug: l.system,
    achievements_total: l.achievementsTotal,
    achievements_completed: l.achievementsDone,
    created_at: l.createdAt,
    updated_at: l.updatedAt,
  }));
  for (const row of logRows) {
    if (row.start_date && row.finish_date && row.finish_date < row.start_date) {
      row.start_date = row.finish_date;
    }
  }

  // Notifications for the tester -------------------------------------------
  const notify = (
    kind: string,
    actor: Account | null,
    data: Row,
    dedupe: string,
    createdAt: Date,
    read: boolean,
  ) => ({
    user_id: tester.id,
    kind,
    actor_id: actor?.id ?? null,
    data,
    dedupe_key: dedupe,
    read_at: read ? later(createdAt, 0.1) : null,
    created_at: createdAt,
  });
  const ownReplies = messages.filter(
    (m) => m.thread_id === own.id && !m.is_opening,
  );
  const notifications = [
    notify(
      "friend_request",
      in1!,
      {},
      `friend_request:${in1!.id}`,
      daysAgo(1),
      false,
    ),
    notify(
      "friend_request",
      in2!,
      {},
      `friend_request:${in2!.id}`,
      minutesAgo(200),
      false,
    ),
    notify(
      "friend_accepted",
      f1!,
      {},
      `friend_accepted:${f1!.id}`,
      daysAgo(8),
      true,
    ),
    ...ownReplies.slice(-2).map((m) =>
      notify(
        "community_reply",
        everyone.find((u) => u.id === m.author_id)!,
        {
          threadId: own.id,
          messageId: m.id,
          threadTitle: `${twoConsoles.title}: PS5 or Switch?`,
          excerpt: (m.body as { content: { content: { text: string }[] }[] })
            .content[0]!.content[0]!.text,
        },
        `community_reply:${m.id}`,
        m.created_at as Date,
        false,
      ),
    ),
    notify(
      "review_upvote_milestone",
      null,
      {
        reviewId: testerReviews[0]!.id,
        gameId: twoConsoles.id,
        gameTitle: twoConsoles.title,
        coverUrl: twoConsoles.coverUrl,
        milestone: 10,
      },
      `review_upvotes:${testerReviews[0]!.id}`,
      daysAgo(2),
      false,
    ),
    notify(
      "community_upvote_milestone",
      null,
      {
        threadId: theirs.id,
        messageId: testerMessage,
        threadTitle: `Is ${threeConsoles.title} worth it in 2026?`,
        excerpt: "Played it on three platforms now.",
        milestone: 5,
      },
      `community_upvotes:${testerMessage}`,
      daysAgo(10),
      true,
    ),
  ];

  // Reports waiting in the admin queue -------------------------------------
  const othersReviews = reviews.filter(
    (rv) => rv.log.user !== tester && rv.isPublic,
  );
  const reports = [
    {
      reporter_id: community[20]!.id,
      target_type: "review",
      target_id: String(othersReviews[3]!.id),
      reason: "spam",
      details: "Same text posted on several games.",
      status: "open",
      created_at: daysAgo(1),
    },
    {
      reporter_id: community[21]!.id,
      target_type: "message",
      target_id: String(messages[5]!.id),
      reason: "harassment",
      details: null,
      status: "open",
      created_at: daysAgo(3),
    },
    {
      reporter_id: community[22]!.id,
      target_type: "profile",
      target_id: community[30]!.id,
      reason: "other",
      details: "Username looks like impersonation.",
      status: "open",
      created_at: minutesAgo(400),
    },
    {
      reporter_id: community[23]!.id,
      target_type: "review",
      target_id: String(othersReviews[8]!.id),
      reason: "other",
      details: "Spoilers without the warning.",
      status: "resolved",
      created_at: daysAgo(20),
      resolved_at: daysAgo(19),
      resolved_by: tester.id,
    },
  ];

  // Active days, for the admin dashboard's charts.
  const activeDays: Row[] = [];
  for (const user of everyone) {
    const often = user === tester ? 0.9 : 0.1 + r() * 0.5;
    for (let d = 0; d < 90; d++) {
      if (daysAgo(d) < user.createdAt) break;
      if (chance(often))
        activeDays.push({ user_id: user.id, day: dateOnly(daysAgo(d)) });
    }
  }

  // Lists, Gaming 25s, favourites and profile details ----------------------
  /* A generator of their own, after everything else has drawn from the
     world's, so adding these left the rest of the world as it was. */
  const r2 = mulberry32(20261105);
  const int2 = (min: number, max: number) =>
    min + Math.floor(r2() * (max - min + 1));
  const shuffle2 = <T>(xs: readonly T[]): T[] => {
    const out = [...xs];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(r2() * (i + 1));
      [out[i], out[j]] = [out[j]!, out[i]!];
    }
    return out;
  };
  const adult = new Set(
    cat.games.filter((g) => g.has_sexual_content).map((g) => g.id as number),
  );
  const byName = (username: string) =>
    everyone.find((u) => u.username === username)!;
  /** Their own games first, as anyone's lists and picks would be, topped
   *  up from the popular ones; never an adult game. A favourite or a pick
   *  is a game they've played, not one still on the wishlist. */
  const gamesFor = (user: Account, count: number, played = false): Game[] => {
    const own = [
      ...new Map(
        logs
          .filter(
            (l) =>
              l.user === user &&
              !adult.has(l.game.id) &&
              (!played || l.status === "played" || l.status === "playing"),
          )
          .map((l) => [l.game.id, l.game]),
      ).values(),
    ];
    const rest = games
      .slice(0, 400)
      .filter((g) => !adult.has(g.id) && !own.includes(g));
    return [...shuffle2(own), ...shuffle2(rest)].slice(0, count);
  };

  // Lists: every visibility, ranked and not, chosen covers and an empty one.
  const lists: Row[] = [];
  const listItems: Row[] = [];
  const listLoves: Row[] = [];
  let nextList = 1;
  const addList = (
    owner: Account,
    list: {
      name: string;
      description?: string;
      visibility?: "everyone" | "friends" | "private";
      colour?: string | null;
      ranked?: boolean;
      size: number;
      chosenCovers?: boolean;
      loves?: number;
    },
  ) => {
    const id = nextList++;
    const createdAt = daysAgo(int2(3, 120));
    const picked = gamesFor(owner, list.size);
    lists.push({
      id,
      user_id: owner.id,
      name: list.name,
      description: list.description ?? "",
      visibility: list.visibility ?? "everyone",
      colour: list.colour ?? null,
      ranked: list.ranked ?? false,
      cover_game_ids: list.chosenCovers
        ? `{${picked
            .slice(0, 4)
            .reverse()
            .map((g) => g.id)
            .join(",")}}`
        : null,
      created_at: createdAt,
      updated_at: later(createdAt, int2(0, 3)),
    });
    picked.forEach((game, i) =>
      listItems.push({
        list_id: id,
        game_id: game.id,
        position: i + 1,
        added_at: later(createdAt, i / 24),
      }),
    );
    for (const fan of shuffle2(community.filter((u) => u !== owner)).slice(
      0,
      list.loves ?? 0,
    )) {
      listLoves.push({
        list_id: id,
        user_id: fan.id,
        created_at: later(createdAt, int2(0, 2)),
      });
    }
    return id;
  };

  const testerTop = addList(tester, {
    name: "My all-time top 10",
    description:
      "In order, and I’ll argue about every one of them. Number one hasn’t moved in years.",
    colour: "violet",
    ranked: true,
    size: 10,
    chosenCovers: true,
    loves: 9,
  });
  const testerCosy = addList(tester, {
    name: "Games for a rainy Sunday when you can’t face anything with a boss fight in it",
    description:
      "Low stakes, nothing that shouts at you, a cup of tea within reach.",
    colour: "teal",
    size: 7,
    loves: 3,
  });
  addList(tester, {
    name: "Still to beat",
    description: "Friends only, so they can nag me about it.",
    visibility: "friends",
    ranked: true,
    size: 5,
  });
  addList(tester, {
    name: "Gift ideas",
    visibility: "private",
    size: 3,
  });
  addList(tester, { name: "Empty for now", size: 0 });

  const halcyon = byName("halcyon");
  const marlowe = byName("marlowe");
  const halcyonTop = addList(halcyon, {
    name: "Best soundtracks",
    description: "Headphones on.",
    colour: "amber",
    ranked: true,
    size: 12,
    chosenCovers: true,
    loves: 14,
  });
  addList(halcyon, {
    name: "For my friends to try",
    visibility: "friends",
    size: 6,
  });
  addList(marlowe, { name: "Short and perfect", size: 8, loves: 4 });
  for (const user of community.slice(6, 18)) {
    addList(user, {
      name: shuffle2([
        "Comfort games",
        "Hidden gems",
        "Played with my brother",
        "Worth the hype",
        "Under ten hours",
        "Couch co-op",
        "Back in the day",
        "Would replay tomorrow",
      ])[0]!,
      colour: shuffle2(["rose", "jade", "azure", "ember", null])[0]!,
      ranked: r2() < 0.4,
      size: int2(3, 12),
      loves: int2(0, 6),
    });
  }
  // Behind a private profile and a friends-only one: none of it shows.
  const ironclad = byName("ironclad");
  const boltcutter = byName("boltcutter");
  addList(ironclad, { name: "Nobody sees this", size: 5, loves: 1 });
  addList(boltcutter, { name: "Friends get to see this", size: 4 });
  // The tester loves a friend's list.
  listLoves.push({
    list_id: halcyonTop,
    user_id: tester.id,
    created_at: daysAgo(4),
  });

  // Gaming 25: one full, the tester's part of the way, a few started.
  const gaming25s: Row[] = [];
  const gaming25Picks: Row[] = [];
  const gaming25Loves: Row[] = [];
  const addGaming25 = (owner: Account, filled: number, loves: number) => {
    const at = daysAgo(int2(2, 60));
    gaming25s.push({ user_id: owner.id, created_at: at, updated_at: at });
    // The centre first, so a grid part filled still has its favourite.
    const categories = [
      GAMING_25_CENTRE,
      ...shuffle2(
        GAMING_25_CATEGORIES.map((c) => c.key).filter(
          (k) => k !== GAMING_25_CENTRE,
        ),
      ),
    ].slice(0, filled);
    gamesFor(owner, filled, true).forEach((game, i) =>
      gaming25Picks.push({
        user_id: owner.id,
        category: categories[i],
        game_id: game.id,
        updated_at: at,
      }),
    );
    for (const fan of shuffle2(everyone.filter((u) => u !== owner)).slice(
      0,
      loves,
    )) {
      gaming25Loves.push({
        owner_id: owner.id,
        user_id: fan.id,
        created_at: later(at, int2(0, 2)),
      });
    }
  };
  addGaming25(halcyon, GAMING_25_SIZE, 11);
  addGaming25(tester, 14, 6);
  addGaming25(marlowe, 6, 1);
  for (const user of community.slice(10, 16)) {
    addGaming25(user, int2(1, GAMING_25_SIZE), int2(0, 3));
  }
  addGaming25(ironclad, GAMING_25_SIZE, 0);

  // Favourites: the tester's six, and a few for others.
  const favourites: Row[] = [];
  const addFavourites = (user: Account, count: number) =>
    gamesFor(user, count, true).forEach((game, position) =>
      favourites.push({
        user_id: user.id,
        game_id: game.id,
        position,
        created_at: daysAgo(int2(5, 90)),
      }),
    );
  addFavourites(tester, 6);
  addFavourites(halcyon, 4);
  addFavourites(marlowe, 2);
  for (const user of community.slice(18, 24)) addFavourites(user, int2(1, 6));

  // Each About field set, at every visibility, and a slot bought for each
  // kind of pin so both pin rows have something in them.
  const profileDetails = [
    `update public.profiles set pronouns = 'he/him', location = 'Manchester', website = 'https://playrates.app', discord = 'tester_plays', steam = 'https://steamcommunity.com/id/playrates-tester',
  about_visibility = '{"firstName":"everyone","pronouns":"everyone","location":"friends","website":"everyone","discord":"private","steam":"everyone"}'::jsonb,
  pinned_lists = '{${testerTop},${testerCosy}}', pinned_reviews = '{${testerReviews[0]!.id}}',
  notifications_seen_at = ${lit(daysAgo(1))}
where id = ${lit(tester.id)};`,
    `update public.profiles set pronouns = 'she/her', location = 'Glasgow', discord = 'halcyon.days',
  about_visibility = '{"location":"friends"}'::jsonb, pinned_lists = '{${halcyonTop}}'
where id = ${lit(halcyon.id)};`,
    `update public.profiles set profile_visibility = 'private' where id = ${lit(ironclad.id)};`,
    `update public.profiles set profile_visibility = 'friends' where id = ${lit(boltcutter.id)};`,
    `insert into public.user_items (user_id, item, quantity, acquired_at)
values (${lit(tester.id)}, 'slot_pinned_list', 1, ${lit(daysAgo(20))}),
       (${lit(tester.id)}, 'slot_pinned_review', 1, ${lit(daysAgo(20))})
on conflict (user_id, item) do nothing;`,
  ].join("\n");

  // One of each colour a notification can wear, unread, for the bell: the
  // love milestones on the tester's list and Gaming 25, a streak about to
  // go, a gift and a task nearly done. The announcements' tones are below.
  const weekEnds = new Date(NOW.getTime() + 1.5 * DAY).toISOString();
  const moreNotifications = [
    // Two friends accepting today: one row in the bell, with both faces.
    ...[f2!, f3!].map((friend, i) =>
      notify(
        "friend_accepted",
        friend,
        {},
        `friend_accepted:${friend.id}`,
        minutesAgo(300 + i * 25),
        false,
      ),
    ),
    notify(
      "list_upvote_milestone",
      null,
      {
        listId: testerTop,
        listName: "My all-time top 10",
        username: tester.username,
        milestone: 5,
      },
      `list_upvotes:${testerTop}`,
      minutesAgo(50),
      false,
    ),
    notify(
      "gaming_25_love_milestone",
      null,
      { username: tester.username, milestone: 5 },
      `gaming_25_loves:${tester.id}`,
      minutesAgo(140),
      false,
    ),
    notify(
      "streak_at_risk",
      null,
      { weeks: 1, shield: false, endsAt: weekEnds },
      `streak_at_risk:${dateOnly(NOW)}`,
      minutesAgo(20),
      false,
    ),
    notify(
      "gift_received",
      halcyon,
      { username: halcyon.username, item: "frame_neon" },
      `gift_received:${halcyon.id}:frame_neon`,
      minutesAgo(400),
      false,
    ),
    notify(
      "task_nearly_done",
      null,
      {
        period: "week",
        quest: "w_rate3",
        label: "Rate 3 games",
        count: 2,
        target: 3,
        xp: 45,
        tokens: 0,
        endsAt: weekEnds,
      },
      `task_nearly_done:w_rate3:${dateOnly(NOW)}`,
      minutesAgo(90),
      false,
    ),
  ];

  // The admin's email log: every way a message can end up. Oldest first,
  // as they'd have been written, so the ids run with the dates.
  const emailRows: Row[] = [
    [newbie, "welcome", "Welcome to PlayRates", "delivered", 0.02, null],
    [
      tester,
      "friend_request",
      "halcyon sent you a friend request",
      "delivered",
      6,
      null,
    ],
    [
      tester,
      "community_reply",
      "New reply in your thread",
      "delivered",
      1,
      null,
    ],
    [tester, "patch_notes", "What’s new: v1.1", "sent", 0.1, null],
    [halcyon, "patch_notes", "What’s new: v1.1", "delivered", 0.1, null],
    [
      marlowe,
      "patch_notes",
      "What’s new: v1.1",
      "delayed",
      0.1,
      "The receiving server is slow to accept; Resend is retrying.",
    ],
    [
      byName("nightjar"),
      "friend_accepted",
      "tester accepted your friend request",
      "bounced",
      3,
      "The mailbox doesn’t exist.",
    ],
    [
      byName("obsidian"),
      "community_reply",
      "New reply in Best route?",
      "complained",
      9,
      "Marked as spam.",
    ],
    [
      byName("pixelwren"),
      "weekly_digest",
      "Your week on PlayRates",
      "failed",
      2,
      "Resend refused the request.",
    ],
    [
      byName("frostbyte"),
      "weekly_digest",
      "Your week on PlayRates",
      "capped",
      2,
      null,
    ],
    [
      byName("cinderlane"),
      "announcement",
      "A log per platform",
      "suppressed",
      2,
      "On Resend’s suppression list.",
    ],
  ]
    .sort((a, b) => (b[4] as number) - (a[4] as number))
    .map(([user, kind, subject, status, days, detail], i) => {
      const sentAt = daysAgo(days as number);
      return {
        user_id: (user as Account).id,
        to_address: `${(user as Account).username}@playrates.test`,
        kind,
        subject,
        status,
        resend_id:
          status === "capped" || status === "failed"
            ? null
            : `local-seed-${i + 1}`,
        broadcast_id: kind === "patch_notes" ? "local-seed-broadcast" : null,
        detail,
        sent_at: sentAt,
        updated_at: later(sentAt, 0.01),
      };
    });

  // Assemble ---------------------------------------------------------------
  const authUsers = everyone
    .map(
      (u) =>
        `(${lit(u.id)}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', ${lit(`${u.username}@playrates.test`)}, extensions.crypt(${lit(LOCAL_PASSWORD)}, extensions.gen_salt('bf', 4)), ${lit(u.createdAt)}, '{"provider":"email","providers":["email"]}'::jsonb, ${json({ username: u.username })}, ${lit(u.createdAt)}, ${lit(u.createdAt)}, '', '', '', '', '', '', '', '')`,
    )
    .join(",\n");

  const profileUpdates = everyone
    .map(
      (u, i) =>
        `update public.profiles set first_name = ${lit(u.firstName)}, bio = ${lit(u.bio)}, timezone = ${lit(u.timezone)}, accent = ${lit(["ember", "amber", "lime", "moss", "jade", "teal", "azure", "indigo", "violet", "plum", "magenta", "rose"][i % 12])}, is_admin = ${u.admin}, last_seen_at = ${lit(u.lastSeen)}, created_at = ${lit(u.createdAt)}, onboarded_at = ${u.onboarded ? lit(u.createdAt) : "null"} where id = ${lit(u.id)};`,
    )
    .join("\n");

  const setval = (table: string) =>
    `select setval(pg_get_serial_sequence('public.${table}', 'id'), coalesce((select max(id) from public.${table}), 1));`;

  return [
    "-- Generated by backend/scripts/local/buildSeed.ts. Do not edit.",
    "-- Made-up people only. Every account's password: see docs/local-development.md.",
    `insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current, phone_change, phone_change_token, reauthentication_token)\nvalues\n${authUsers};`,
    `insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select id::text, id, jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true), 'email', created_at, created_at, created_at
from auth.users;`,
    profileUpdates,
    insert("game_logs", logRows, true),
    setval("game_logs"),
    insert(
      "reviews",
      reviews.map((rv) => ({
        id: rv.id,
        user_id: rv.log.user.id,
        game_id: rv.log.game.id,
        log_id: rv.log.id,
        body: rv.body,
        is_public: rv.isPublic,
        contains_spoilers: rv.spoilers,
        created_at: rv.createdAt,
        updated_at: rv.createdAt,
      })),
      true,
    ),
    setval("reviews"),
    insert("review_votes", reviewVotes),
    insert("friendships", [...friendships.values()]),
    insert("community_threads", threads, true),
    setval("community_threads"),
    insert("community_messages", messages, true),
    setval("community_messages"),
    patchNotesSql,
    insert("community_message_votes", messageVotes),
    insert("notifications", [...notifications, ...moreNotifications]),
    insert(
      "content_reports",
      reports.map((rp) => ({ resolved_at: null, resolved_by: null, ...rp })),
    ),
    insert("user_active_days", activeDays),
    insert("game_lists", lists, true),
    setval("game_lists"),
    insert("game_list_items", listItems),
    insert("game_list_votes", listLoves),
    insert("gaming_25s", gaming25s),
    insert("gaming_25_picks", gaming25Picks),
    insert("gaming_25_loves", gaming25Loves),
    insert("favourite_games", favourites),
    profileDetails,
    insert("email_messages", emailRows),
    // An announcement in each tone, sent to everyone; most have read them,
    // the tester none, so the bell shows every colour.
    ...(
      [
        [
          "update",
          "A log per platform",
          "You can now log a game once for each console you played it on.",
          "/community",
          2,
        ],
        [
          "info",
          "Your data, any time",
          "Settings can now download everything you’ve logged, as a file.",
          "/settings",
          5,
        ],
        [
          "warning",
          "Down for a moment on Sunday",
          "PlayRates will be offline for about 20 minutes from 7am while we move servers.",
          null,
          1,
        ],
        [
          "celebration",
          "10,000 games logged",
          "Thank you, every one of you. Here’s to the next ten thousand.",
          null,
          3,
        ],
      ] as const
    ).map(
      ([tone, title, body, link, days]) => `with a as (
  insert into public.announcements (tone, title, body, link_path, sent_by, created_at)
  values (${lit(tone)}, ${lit(title)}, ${lit(body)}, ${lit(link)}, ${lit(staff.id)}, ${lit(daysAgo(days))})
  returning id
)
select public.broadcast_announcement(id) from a;`,
    ),
    `update public.notifications n set created_at = a.created_at
from public.announcements a where n.kind = 'announcement' and n.dedupe_key = 'announcement:' || a.id;
update public.notifications set read_at = created_at + interval '1 hour'
where kind = 'announcement' and user_id <> ${lit(tester.id)} and random() < 0.7;`,
    // Welcome notes are long since read, except by the account just made.
    `update public.notifications n set read_at = p.created_at, archived_at = p.created_at, created_at = p.created_at
from public.profiles p where n.user_id = p.id and n.kind = 'welcome' and p.username <> 'newcomer';`,
    // The triggers wrote the activity feed as of now; date it as it happened.
    `delete from public.activity_events where kind = 'profile_updated';
update public.activity_events e set created_at = p.created_at from public.profiles p where e.kind = 'signup' and e.subject_id = p.id::text;
update public.activity_events e set created_at = l.created_at from public.game_logs l where e.kind = 'log_added' and e.subject_id = l.id::text;
update public.activity_events e set created_at = r.created_at from public.reviews r where e.kind = 'review_posted' and e.subject_id = r.id::text;
update public.activity_events e set created_at = t.created_at from public.community_threads t where e.kind = 'thread_created' and e.subject_id = t.id::text;
update public.activity_events e set created_at = m.created_at from public.community_messages m where e.kind = 'message_posted' and e.subject_id = m.id::text;
update public.activity_events e set created_at = v.created_at from public.review_votes v where e.kind = 'review_upvoted' and e.actor_id = v.user_id and e.subject_id = v.review_id::text;
update public.activity_events e set created_at = v.created_at from public.community_message_votes v where e.kind = 'message_upvoted' and e.actor_id = v.user_id and e.subject_id = v.message_id::text;
update public.activity_events e set created_at = f.updated_at from public.friendships f
where e.kind in ('friend_requested', 'friend_accepted') and e.actor_id in (f.user_a_id, f.user_b_id) and e.subject_id in (f.user_a_id::text, f.user_b_id::text);`,
  ].join("\n\n");
};

const main = async () => {
  const cat = JSON.parse(
    await readFile(resolve(seedDir, "catalogue.json"), "utf8"),
  ) as Catalogue;
  await writeFile(resolve(seedDir, "10_catalogue.sql"), catalogueSql(cat));
  await writeFile(resolve(seedDir, "20_world.sql"), buildWorld(cat));
  console.log(`wrote the local seed to ${seedDir}`);
};

await main();
