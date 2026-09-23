/**
 * Test data for local development.
 *
 *   npm run seed:test -w backend
 *
 * Creates a handful of accounts with logs, reviews and votes, and friendships
 * in every state the UI has to render. Safe to re-run — accounts are matched
 * by email, logs upsert on (user_id, game_id), friendships on the ordered pair.
 *
 * Never point this at production: it writes with the service-role key.
 */
import "../src/config/loadEnv.js";
import { env } from "../src/config/env.js";
import { supabase } from "../src/config/supabase.js";
import { createLogger } from "../src/lib/logger.js";

const MAIN_USERNAME = "calbgyn";
const MAIN_FIRST_NAME = "Callum";

interface TestUser {
  username: string;
  firstName: string;
  bio: string;
  /** How this person relates to the main account. */
  relation: "friend" | "request-received" | "request-sent" | "none";
}

const TEST_USERS: TestUser[] = [
  {
    username: "marlowe",
    firstName: "Marlowe",
    bio: "Slow burn RPGs and anything with a good map.",
    relation: "friend",
  },
  {
    username: "tessellate",
    firstName: "Tess",
    bio: "Puzzle games, mostly. Occasionally a shooter.",
    relation: "friend",
  },
  {
    username: "quietriver",
    firstName: "Sam",
    bio: "Finishing things is the hard part.",
    relation: "friend",
  },
  {
    username: "halcyon",
    firstName: "Iris",
    bio: "Backlog of shame, proudly maintained.",
    relation: "request-received",
  },
  {
    username: "nightjar",
    firstName: "Noor",
    bio: "Horror and survival. Nothing cosy.",
    relation: "request-received",
  },
  {
    username: "obsidian",
    firstName: "Obi",
    bio: "100% or nothing.",
    relation: "request-sent",
  },
];

/** Spread across the year so the profile chart has a shape. */
const MONTHS = [0, 1, 2, 3, 4, 5, 6, 7, 8];

const iso = (month: number, day: number): string =>
  `2026-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const REVIEW_BODIES = [
  "Held up far better than I expected. The middle act drags but the ending earns it.",
  "Mechanically superb, narratively thin. Worth it for the movement alone.",
  "I bounced off this twice before it clicked. Give it four hours.",
  "Not much here I hadn't seen elsewhere, but all of it done well.",
  "The best thing it does is trust you to work things out.",
  "Gorgeous, overlong, and I'd still recommend it.",
  "Every system feeds the next one. Rare to see it this tidy.",
  "Fun for a weekend. Would not go back.",
];

const main = async () => {
  const logger = createLogger();
  const config = env();
  const db = supabase();

  if (config.NODE_ENV === "production") {
    logger.error("refusing to seed test data against production");
    process.exit(1);
  }

  // Popular games, so the covers are recognisable when eyeballing the result.
  const { data: games, error: gamesError } = await db
    .from("games")
    .select("id, title")
    .order("rawg_added_count", { ascending: false, nullsFirst: false })
    .limit(40);
  if (gamesError) throw gamesError;
  if (!games || games.length < 20) {
    logger.error("not enough games in the catalogue to seed against");
    process.exit(1);
  }

  const { data: main, error: mainError } = await db
    .from("profiles")
    .select("id")
    .eq("username", MAIN_USERNAME)
    .single();
  if (mainError || !main) {
    logger.error({ username: MAIN_USERNAME }, "main account not found");
    process.exit(1);
  }

  await db
    .from("profiles")
    .update({ first_name: MAIN_FIRST_NAME })
    .eq("id", main.id);
  logger.info({ firstName: MAIN_FIRST_NAME }, "set first name");

  /* --- accounts ------------------------------------------------------ */
  const ids = new Map<string, string>();

  for (const user of TEST_USERS) {
    const email = `${user.username}@playrates.test`;

    const { data: existing } = await db
      .from("profiles")
      .select("id")
      .eq("username", user.username)
      .maybeSingle();

    if (existing) {
      ids.set(user.username, existing.id);
    } else {
      const { data: created, error } = await db.auth.admin.createUser({
        email,
        password: `test-${user.username}-2026`,
        email_confirm: true,
        // handle_new_user reads username out of the metadata to
        // seed the profile row.
        user_metadata: { username: user.username },
      });
      if (error) throw error;
      ids.set(user.username, created.user.id);
      logger.info({ username: user.username, email }, "created account");
    }

    const id = ids.get(user.username)!;
    await db
      .from("profiles")
      .update({
        first_name: user.firstName,
        bio: user.bio,
        // Recent enough that some of them read as online.
        last_seen_at:
          user.relation === "friend"
            ? new Date().toISOString()
            : new Date(Date.now() - 864e5).toISOString(),
      })
      .eq("id", id);
  }

  /* --- logs ----------------------------------------------------------- */
  const everyone = [
    { username: MAIN_USERNAME, id: main.id },
    ...TEST_USERS.map((u) => ({
      username: u.username,
      id: ids.get(u.username)!,
    })),
  ];

  const STATUSES = [
    { status: "played", played: "finished" },
    { status: "played", played: "mastered" },
    { status: "played", played: "shelved" },
    { status: "played", played: "retired" },
    { status: "playing", played: null },
    { status: "backlog", played: null },
    { status: "wishlist", played: null },
  ] as const;

  let logCount = 0;
  let reviewCount = 0;
  const reviewIds: number[] = [];

  for (const [personIndex, person] of everyone.entries()) {
    // Offset per person so no two shelves are identical.
    const slice = games.slice(personIndex * 3, personIndex * 3 + 14);

    for (const [i, game] of slice.entries()) {
      const shape = STATUSES[i % STATUSES.length]!;
      const played = shape.status === "played";
      const month = MONTHS[i % MONTHS.length]!;

      const { error } = await db.from("game_logs").upsert(
        {
          user_id: person.id,
          game_id: game.id,
          status: shape.status,
          played_status: played ? shape.played : null,
          // Half points only, matching the constraint.
          rating: played ? 5 + ((i * 1.5) % 5.5) : null,
          hours_played: played ? 8 + i * 4 : null,
          hours_to_beat: played ? 10 + i * 3 : null,
          start_date: played ? iso(month, 3) : null,
          finish_date: played ? iso(month, 19) : null,
          // Family and machine together, the way the log editor writes them.
          platform_slug: ["steam", "playstation", "xbox"][i % 3]!,
          system_slug: ["steam", "playstation5", "xbox-series-x"][i % 3]!,
          achievements_total: played ? 40 : null,
          achievements_completed: played ? Math.min(40, 6 + i * 4) : null,
        },
        { onConflict: "user_id,game_id" },
      );
      if (error) throw error;
      logCount += 1;

      // A review on roughly every third played log.
      if (played && i % 3 === 0) {
        const { data: review, error: reviewError } = await db
          .from("reviews")
          .upsert(
            {
              user_id: person.id,
              game_id: game.id,
              body: REVIEW_BODIES[(personIndex + i) % REVIEW_BODIES.length]!,
              is_public: true,
            },
            { onConflict: "user_id,game_id" },
          )
          .select("id")
          .single();
        if (reviewError) throw reviewError;
        reviewIds.push(review.id);
        reviewCount += 1;
      }
    }
  }

  logger.info({ logCount, reviewCount }, "seeded logs and reviews");

  /* --- votes ---------------------------------------------------------- */
  let votes = 0;
  for (const [i, reviewId] of reviewIds.entries()) {
    // Varying voters per review, so "most helpful" has an order.
    for (const person of everyone.slice(0, (i % 4) + 1)) {
      const { error } = await db
        .from("review_votes")
        .upsert(
          { review_id: reviewId, user_id: person.id },
          { onConflict: "review_id,user_id" },
        );
      if (error) throw error;
      votes += 1;
    }
  }
  logger.info({ votes }, "seeded review votes");

  /* --- friendships ---------------------------------------------------- */
  const orderPair = (x: string, y: string): [string, string] =>
    x < y ? [x, y] : [y, x];

  let friendships = 0;
  for (const user of TEST_USERS) {
    if (user.relation === "none") continue;
    const other = ids.get(user.username)!;
    const [a, b] = orderPair(main.id, other);

    const { error } = await db.from("friendships").upsert(
      {
        user_a_id: a,
        user_b_id: b,
        status: user.relation === "friend" ? "accepted" : "pending",
        // Who asked decides which side sees "waiting on you".
        requested_by: user.relation === "request-received" ? other : main.id,
      },
      { onConflict: "user_a_id,user_b_id" },
    );
    if (error) throw error;
    friendships += 1;
  }

  // The test accounts are friends with each other, so the feed has variety.
  for (let i = 0; i < TEST_USERS.length - 1; i += 1) {
    const [a, b] = orderPair(
      ids.get(TEST_USERS[i]!.username)!,
      ids.get(TEST_USERS[i + 1]!.username)!,
    );
    const { error } = await db
      .from("friendships")
      .upsert(
        { user_a_id: a, user_b_id: b, status: "accepted", requested_by: a },
        { onConflict: "user_a_id,user_b_id" },
      );
    if (error) throw error;
    friendships += 1;
  }

  logger.info({ friendships }, "seeded friendships");
  logger.info(
    {
      accounts: TEST_USERS.length,
      passwordPattern: "test-<username>-2026",
    },
    "test data complete",
  );
};

main().catch((error) => {
  createLogger().error({ err: error }, "seeding test data failed");
  process.exit(1);
});
