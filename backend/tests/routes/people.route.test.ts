import { describe, expect, it } from "vitest";
import request from "supertest";
import {
  authHeader,
  buildTestApp,
  USER_A,
  USER_B,
} from "../helpers/buildTestApp.js";
import {
  baseSeed,
  buildFriendship,
  buildGame,
  buildGameLog,
  buildProfile,
} from "../helpers/fixtures.js";

const USER_C = "33333333-3333-3333-3333-333333333333";

/** A and B rated the same three games; C rated game 1 only. */
const seed = () => {
  const base = baseSeed();
  const rate = (id: number, user: string, game: number, rating: number) =>
    buildGameLog({
      id,
      user_id: user,
      game_id: game,
      status: "played",
      rating,
    });
  return {
    ...base,
    profiles: [...base.profiles, buildProfile({ id: USER_C, username: "cy" })],
    games: [1, 2, 3].map((id) => buildGame({ id, title: `Game ${id}` })),
    gameLogs: [
      rate(1, USER_A, 1, 9),
      rate(2, USER_A, 2, 7),
      rate(3, USER_A, 3, 5),
      rate(4, USER_B, 1, 8),
      rate(5, USER_B, 2, 7),
      rate(6, USER_B, 3, 6),
      rate(7, USER_C, 1, 10),
    ],
  };
};

const matches = (app: Parameters<typeof request>[0], as = USER_A) =>
  request(app)
    .get("/api/v1/me/friends/matches")
    .set("Authorization", authHeader(as));

describe("taste matches", () => {
  it("finds who rates like you, with how closely", async () => {
    const { app } = buildTestApp({ seed: seed() });
    const response = await matches(app);
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([
      expect.objectContaining({
        user: expect.objectContaining({ id: USER_B }),
        shared: 3,
        agreement: 93,
      }),
    ]);
  });

  it("leaves out friends, who are found already", async () => {
    const { app } = buildTestApp({
      seed: {
        ...seed(),
        friendships: [buildFriendship({ status: "accepted" })],
      },
    });
    expect((await matches(app)).body.data).toEqual([]);
  });

  it("leaves out profiles not open to everyone", async () => {
    const s = seed();
    s.profiles.find((p) => p.id === USER_B)!.profile_visibility = "friends";
    const { app } = buildTestApp({ seed: s });
    expect((await matches(app)).body.data).toEqual([]);
  });

  it("needs a session", async () => {
    const { app } = buildTestApp({ seed: seed() });
    expect((await request(app).get("/api/v1/me/friends/matches")).status).toBe(
      401,
    );
  });
});

describe("a game's fans", () => {
  it("lists who rated it 8 or more, highest first, to anyone", async () => {
    const { app } = buildTestApp({ seed: seed() });
    const response = await request(app).get("/api/v1/games/1/fans");
    expect(response.status).toBe(200);
    expect(
      response.body.data.map(
        (f: { user: { username: string }; rating: number }) => [
          f.user.username,
          f.rating,
        ],
      ),
    ).toEqual([
      ["cy", 10],
      ["devuser", 9],
      [expect.any(String), 8],
    ]);
  });

  it("doesn't get in the way of the game itself", async () => {
    const { app } = buildTestApp({ seed: seed() });
    expect((await request(app).get("/api/v1/games/1")).status).toBe(200);
    expect((await request(app).get("/api/v1/games/x/fans")).status).toBe(422);
  });
});

const shared = (app: Parameters<typeof request>[0], as = USER_A) =>
  request(app)
    .get("/api/v1/me/friends/shared")
    .set("Authorization", authHeader(as));

describe("people who play what you play", () => {
  it("finds those who logged the same games, most in common first, naming a few", async () => {
    const { app } = buildTestApp({ seed: seed() });
    const response = await shared(app);
    expect(response.status).toBe(200);
    expect(
      response.body.data.map((m: { user: { id: string } }) => m.user.id),
    ).toEqual([USER_B, USER_C]);
    expect(response.body.data[0]).toMatchObject({
      shared: 3,
      games: expect.arrayContaining([
        expect.objectContaining({ id: 1, title: "Game 1" }),
      ]),
    });
  });

  it("leaves out profiles not open to everyone", async () => {
    const s = seed();
    s.profiles.find((p) => p.id === USER_B)!.profile_visibility = "private";
    const { app } = buildTestApp({ seed: s });
    const ids = (await shared(app)).body.data.map(
      (m: { user: { id: string } }) => m.user.id,
    );
    expect(ids).not.toContain(USER_B);
  });

  it("leaves out friends, who are found already", async () => {
    const { app } = buildTestApp({
      seed: {
        ...seed(),
        friendships: [buildFriendship({ status: "accepted" })],
      },
    });
    const ids = (await shared(app)).body.data.map(
      (m: { user: { id: string } }) => m.user.id,
    );
    expect(ids).toEqual([USER_C]);
  });

  it("doesn't match on, or name, an adult game", async () => {
    const s = seed();
    s.games = s.games.map((g) =>
      g.id === 1 ? { ...g, has_sexual_content: true } : g,
    );
    const { app } = buildTestApp({ seed: s });
    const data = (await shared(app)).body.data;
    expect(data.map((m: { user: { id: string } }) => m.user.id)).toEqual([
      USER_B,
    ]);
    expect(data[0].shared).toBe(2);
    expect(JSON.stringify(data)).not.toContain("Game 1");
  });

  it("needs signing in", async () => {
    const { app } = buildTestApp({ seed: seed() });
    expect((await request(app).get("/api/v1/me/friends/shared")).status).toBe(
      401,
    );
  });
});
