import { describe, expect, it } from "vitest";
import request from "supertest";
import type { FriendshipRow } from "../../src/types/database.types.js";
import { authHeader, buildTestApp, USER_A } from "../helpers/buildTestApp.js";
import {
  baseSeed,
  buildFriendship,
  buildProfile,
} from "../helpers/fixtures.js";

const PRIVATE = "00000000-0000-4000-8000-000000000098";
const FRIENDS_ONLY = "00000000-0000-4000-8000-000000000099";

/** Twelve public players, p01 to p12. */
const players = Array.from({ length: 12 }, (_, i) => ({
  id: `00000000-0000-4000-8000-0000000000${String(i + 10)}`,
  username: `p${String(i + 1).padStart(2, "0")}`,
}));

const setup = (
  you: Parameters<typeof buildProfile>[0] = {},
  friendships: FriendshipRow[] = [],
) => {
  const built = buildTestApp({
    seed: {
      ...baseSeed(),
      profiles: [
        buildProfile({ xp: 0, ...you }),
        // Fresh each time: awarding XP adds to the row itself.
        ...players.map((p) => buildProfile({ ...p, xp: 0 })),
        buildProfile({
          id: PRIVATE,
          username: "hidden",
          xp: 0,
          profile_visibility: "private",
        }),
        buildProfile({
          id: FRIENDS_ONLY,
          username: "friendsonly",
          xp: 0,
          profile_visibility: "friends",
        }),
      ],
      friendships,
    },
  });
  const xp = (user: string, amount: number, key = "k") =>
    built.repos.progress.awardXp(user, "rate", `${key}:${user}`, amount);
  const board = async (signedIn = true, period = "week") => {
    const req = request(built.app).get(
      `/api/v1/progress/leaderboard?period=${period}`,
    );
    return (
      signedIn ? req.set({ Authorization: authHeader(USER_A) }) : req
    ).then((res) => res);
  };
  return { built, xp, board };
};

/** p01 the busiest at 200, each after 10 XP behind the last. */
const seedPlayers = async (
  xp: (user: string, amount: number) => Promise<void>,
) => {
  for (const [i, p] of players.entries()) await xp(p.id, 200 - i * 10);
};

type Row = { username?: string; rank: number; hidden?: boolean };
const ranks = (body: { rows: Row[] }) =>
  body.rows.map((r) => [r.hidden ? "(hidden)" : r.username, r.rank]);

describe("the site leaderboard", () => {
  it("shows the top five, then you with one either side", async () => {
    const { xp, board } = setup();
    await seedPlayers(xp);
    // Between p09 (120) and p10 (110): tenth.
    await xp(USER_A, 115);

    const res = await board();
    expect(res.status).toBe(200);
    expect(ranks(res.body)).toEqual([
      ["p01", 1],
      ["p02", 2],
      ["p03", 3],
      ["p04", 4],
      ["p05", 5],
      ["p09", 9],
      ["devuser", 10],
      ["p10", 11],
    ]);
    expect(
      res.body.rows.find((r: { isYou: boolean }) => r.isYou).username,
    ).toBe("devuser");
    expect(res.body.total).toBe(13);
  });

  it("runs straight on from the top when you're sixth, with nobody twice", async () => {
    const { xp, board } = setup();
    await seedPlayers(xp);
    await xp(USER_A, 155);

    expect(ranks((await board()).body)).toEqual([
      ["p01", 1],
      ["p02", 2],
      ["p03", 3],
      ["p04", 4],
      ["p05", 5],
      ["devuser", 6],
      ["p06", 7],
    ]);
  });

  it("keeps a private or friends-only player's place, but not who they are", async () => {
    const { xp, board } = setup();
    await xp(PRIVATE, 900);
    await xp(FRIENDS_ONLY, 800);
    await xp(players[0]!.id, 10);

    const body = (await board()).body;
    expect(ranks(body)).toEqual([
      ["(hidden)", 1],
      ["(hidden)", 2],
      ["p01", 3],
      ["devuser", 4],
    ]);
    expect(body.rows[0]).toEqual({
      hidden: true,
      rank: 1,
      xp: 900,
      isYou: false,
    });
    expect(JSON.stringify(body)).not.toMatch(/"username":"hidden"|friendsonly/);
  });

  it("names a friends-only player to their friends", async () => {
    const { xp, board } = setup({}, [
      buildFriendship({ user_b_id: FRIENDS_ONLY, status: "accepted" }),
    ]);
    await xp(FRIENDS_ONLY, 800);

    expect(ranks((await board()).body)[0]).toEqual(["friendsonly", 1]);
    expect(ranks((await board(false)).body)[0]).toEqual(["(hidden)", 1]);
  });

  it("names you to yourself, and to nobody else, when your profile is private", async () => {
    const { xp, board } = setup({ profile_visibility: "private" });
    await seedPlayers(xp);
    await xp(USER_A, 500);

    expect(ranks((await board()).body)[0]).toEqual(["devuser", 1]);
    expect(ranks((await board(false)).body)[0]).toEqual(["(hidden)", 1]);
  });

  it("ranks no one who earned nothing, except you at the foot", async () => {
    const { xp, board } = setup();
    await xp(players[0]!.id, 50);

    const body = (await board()).body;
    expect(ranks(body)).toEqual([
      ["p01", 1],
      ["devuser", 2],
    ]);
    expect(body.rows[1].xp).toBe(0);
    // A place, but not a player.
    expect(body.total).toBe(1);
  });

  it("shows a signed-out visitor the top five alone", async () => {
    const { xp, board } = setup();
    await seedPlayers(xp);
    await xp(USER_A, 115);

    const body = (await board(false)).body;
    expect(body.rows).toHaveLength(5);
    expect(body.rows.every((r: { isYou: boolean }) => !r.isYou)).toBe(true);
  });

  it("counts only this period's XP on the week's board, and everything on all time's", async () => {
    const { built, xp, board } = setup();
    await xp(players[0]!.id, 30);
    built.state.xpEvents.push({
      id: 9999,
      user_id: players[1]!.id,
      source: "rate",
      key: "old",
      xp: 500,
      created_at: "2020-01-01T00:00:00.000Z",
    });
    built.state.profiles.find((p) => p.id === players[1]!.id)!.xp = 500;

    expect(ranks((await board(false, "week")).body)).toEqual([["p01", 1]]);
    expect(ranks((await board(false, "all")).body)).toEqual([
      ["p02", 1],
      ["p01", 2],
    ]);
  });

  it("refuses a period it doesn't keep", async () => {
    const { board } = setup();
    expect((await board(false, "year")).status).toBe(422);
  });
});
