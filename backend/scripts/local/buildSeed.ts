/**
 * Writes the SQL the local database starts from on every reset.
 *
 *   npm run local:seed      (run for you by npm run dev:local)
 *
 * From supabase/seed/catalogue.json (see snapshot.ts) it writes:
 *   10_catalogue.sql  the games, their platforms, consoles and genres
 *   20_world.sql      a made-up community using them: accounts, logs on one
 *                     or more consoles, reviews, votes, friendships, threads,
 *                     notifications, reports, an announcement
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
  // Counts and averages are the triggers' to work out from local logs.
  const games = cat.games.map((g) => ({
    ...g,
    log_count: 0,
    avg_rating: null,
    rating_count: 0,
  }));
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
      ("finish" in fixed || "start" in fixed
        ? (fixed.finish ?? fixed.start ?? null)
        : null) ??
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

  // Votes: most reviews get a few, the tester's first one a milestone's worth.
  const reviewVotes: Row[] = [];
  for (const rev of reviews) {
    if (!rev.isPublic) continue;
    const count = rev === testerReviews[0] ? 12 : Math.floor(r() ** 3 * 14);
    for (const voter of shuffle(
      community.filter((u) => u !== rev.log.user),
    ).slice(0, count)) {
      reviewVotes.push({
        review_id: rev.id,
        user_id: voter.id,
        created_at: later(rev.createdAt, int(0, 20)),
      });
    }
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
  const vote = (messageId: number, voters: Account[], after: Date) => {
    for (const voter of voters) {
      messageVotes.push({
        message_id: messageId,
        user_id: voter.id,
        created_at: later(after, int(0, 5)),
      });
    }
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
  vote(testerMessage, community.slice(10, 17), daysAgo(12));

  // Patch notes: the thread a migration made, signed by the team, with two
  // entries in it.
  const patchStart = daysAgo(90);
  const patchEntries = [
    {
      at: daysAgo(30),
      heading: "Forgiving search",
      text: "Search now finds games however you spell them: III or 3, accents or not.",
    },
    {
      at: daysAgo(2),
      heading: "A log per platform",
      text: "Played something on more than one console? Log each one. Your game page adds up the hours and shows your quickest finish.",
    },
  ];
  const patchNotesSql = [
    `update public.community_threads set author_id = ${lit(staff.id)}, created_at = ${lit(patchStart)}
where subject_kind = 'patch_notes';`,
    `update public.community_messages m set author_id = ${lit(staff.id)}, created_at = ${lit(patchStart)}
from public.community_threads t where m.thread_id = t.id and t.subject_kind = 'patch_notes' and m.is_opening;`,
    ...patchEntries.map(
      (
        entry,
      ) => `insert into public.community_messages (thread_id, author_id, body, created_at)
select id, ${lit(staff.id)}, ${json({
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 2 },
            content: [{ type: "text", text: entry.heading }],
          },
          { type: "paragraph", content: [{ type: "text", text: entry.text }] },
        ],
      })}, ${lit(entry.at)}
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
    insert("notifications", notifications),
    insert(
      "content_reports",
      reports.map((rp) => ({ resolved_at: null, resolved_by: null, ...rp })),
    ),
    insert("user_active_days", activeDays),
    // An announcement everyone was sent; most have read it.
    `with a as (
  insert into public.announcements (tone, title, body, link_path, sent_by, created_at)
  values ('update', 'A log per platform', 'You can now log a game once for each console you played it on.', '/community', ${lit(staff.id)}, ${lit(daysAgo(2))})
  returning id
)
select public.broadcast_announcement(id) from a;`,
    `update public.notifications set read_at = created_at + interval '1 hour', created_at = ${lit(daysAgo(2))}
where kind = 'announcement' and user_id <> ${lit(tester.id)} and random() < 0.7;
update public.notifications set created_at = ${lit(daysAgo(2))} where kind = 'announcement';`,
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
