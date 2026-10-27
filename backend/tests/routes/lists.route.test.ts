import { describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { MAX_LISTS } from "@playrates/shared";
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
  buildProfile,
} from "../helpers/fixtures.js";

const STRANGER = "33333333-3333-3333-3333-333333333333";

const games = [1, 2, 3, 4, 5, 6].map((id) =>
  buildGame({ id, slug: `game-${id}`, title: `Game ${id}` }),
);

const seed = (overrides: object = {}) => ({
  ...baseSeed(),
  profiles: [
    buildProfile(),
    buildProfile({ id: USER_B, username: "frienduser" }),
    buildProfile({ id: STRANGER, username: "stranger" }),
  ],
  games: [
    ...games,
    buildGame({ id: 9, slug: "adult", has_sexual_content: true }),
  ],
  ...overrides,
});

const as = (user: string) => ({ Authorization: authHeader(user) });

const setup = (overrides: object = {}) => {
  const built = buildTestApp({ seed: seed(overrides) });
  const app: Express = built.app;
  const create = async (body: object, user = USER_A) =>
    (await request(app).post("/api/v1/me/lists").set(as(user)).send(body)).body;
  const get = (id: number, user?: string) => {
    const req = request(app).get(`/api/v1/lists/${id}`);
    return user ? req.set(as(user)) : req;
  };
  const patch = (id: number, body: object, user = USER_A) =>
    request(app).patch(`/api/v1/me/lists/${id}`).set(as(user)).send(body);
  const setGames = (id: number, gameIds: number[], user = USER_A) =>
    request(app)
      .put(`/api/v1/me/lists/${id}/games`)
      .set(as(user))
      .send({ gameIds });
  const vote = (id: number, user: string) =>
    request(app).post(`/api/v1/lists/${id}/vote`).set(as(user));
  return { ...built, app, create, get, patch, setGames, vote };
};

const titles = (list: { games: { game: { title: string } }[] }) =>
  list.games.map((e) => e.game.title);
const coverIds = (list: { covers: { id: number }[] }) =>
  list.covers.map((c) => c.id);

describe("making a list", () => {
  it("starts it neutral and public, with the games it's given", async () => {
    const { create } = setup();

    const list = await create({ name: " Cosy games ", gameIds: [3, 1] });

    expect(list).toMatchObject({
      name: "Cosy games",
      description: "",
      visibility: "everyone",
      colour: null,
      ranked: false,
      gameCount: 2,
      voteCount: 0,
      owner: { username: "devuser" },
    });
    expect(titles(list)).toEqual(["Game 3", "Game 1"]);
    expect(list.games.map((e: { rank: number }) => e.rank)).toEqual([1, 2]);
  });

  it("refuses a game that isn't there, and an adult one", async () => {
    const { app } = setup();
    const post = (gameIds: number[]) =>
      request(app)
        .post("/api/v1/me/lists")
        .set(as(USER_A))
        .send({ name: "x", gameIds });

    expect((await post([404])).status).toBe(404);
    expect((await post([9])).status).toBe(422);
  });

  it(`stops at ${MAX_LISTS} lists`, async () => {
    const full = Array.from({ length: MAX_LISTS }, (_, i) => ({
      id: i + 1,
      user_id: USER_A,
      name: `List ${i}`,
      description: "",
      visibility: "everyone" as const,
      colour: null,
      ranked: false,
      cover_game_ids: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    }));
    const { app } = setup({ gameLists: full });

    const response = await request(app)
      .post("/api/v1/me/lists")
      .set(as(USER_A))
      .send({ name: "One more" });

    expect(response.status).toBe(422);
  });

  it("needs a name, and someone signed in", async () => {
    const { app } = setup();
    expect(
      (
        await request(app)
          .post("/api/v1/me/lists")
          .set(as(USER_A))
          .send({ name: "  " })
      ).status,
    ).toBe(422);
    expect(
      (await request(app).post("/api/v1/me/lists").send({ name: "x" })).status,
    ).toBe(401);
  });
});

describe("a list's games and covers", () => {
  it("adds to the end, once, and takes one out", async () => {
    const { app, create, get } = setup();
    const { id } = await create({ name: "x", gameIds: [1] });
    const add = (gameId: number) =>
      request(app)
        .post(`/api/v1/me/lists/${id}/games`)
        .set(as(USER_A))
        .send({ gameId });

    await add(2);
    await add(1);
    await request(app).delete(`/api/v1/me/lists/${id}/games/1`).set(as(USER_A));

    expect(titles((await get(id, USER_A)).body)).toEqual(["Game 2"]);
  });

  it("covers itself with its first four, until four are picked", async () => {
    const { create, patch, get } = setup();
    const { id } = await create({ name: "x", gameIds: [1, 2, 3, 4, 5, 6] });

    expect(coverIds((await get(id, USER_A)).body)).toEqual([1, 2, 3, 4]);

    // Two picked: they come first, the list's first games fill the rest.
    await patch(id, { coverGameIds: [6, 2] });
    expect(coverIds((await get(id, USER_A)).body)).toEqual([6, 2, 1, 3]);

    await patch(id, { coverGameIds: null });
    expect(coverIds((await get(id, USER_A)).body)).toEqual([1, 2, 3, 4]);
  });

  /* cover_url is often a wide artwork; a cover wants the box art, as the
     rest of the app shows it. */
  it("covers itself with each game's box art", async () => {
    const { create } = setup({
      games: [
        buildGame({
          id: 1,
          cover_url: "https://img/artwork.jpg",
          box_art_url: "https://img/box.jpg",
        }),
      ],
    });

    const list = await create({ name: "x", gameIds: [1] });

    expect(list.covers[0].coverUrl).toBe("https://img/box.jpg");
  });

  it("takes only its own games for covers", async () => {
    const { create, patch } = setup();
    const { id } = await create({ name: "x", gameIds: [1, 2] });

    expect((await patch(id, { coverGameIds: [5] })).status).toBe(422);
  });

  it("lets a picked cover go with its game", async () => {
    const { create, patch, setGames } = setup();
    const { id } = await create({ name: "x", gameIds: [1, 2, 3] });
    await patch(id, { coverGameIds: [3] });

    const after = (await setGames(id, [2, 1])).body;

    expect(after.coverGameIds).toBeNull();
    expect(coverIds(after)).toEqual([2, 1]);
  });

  it("is reordered, and changed, only by its owner", async () => {
    const { create, setGames, patch } = setup();
    const { id } = await create({ name: "x", gameIds: [1, 2, 3] });

    expect(titles((await setGames(id, [3, 1, 2])).body)).toEqual([
      "Game 3",
      "Game 1",
      "Game 2",
    ]);
    expect((await setGames(id, [1], USER_B)).status).toBe(404);
    expect((await patch(id, { name: "Mine now" }, USER_B)).status).toBe(404);
  });
});

describe("who sees a list", () => {
  const lists = async (create: ReturnType<typeof setup>["create"]) => ({
    open: (await create({ name: "Open" })).id as number,
    friends: (await create({ name: "Friends", visibility: "friends" }))
      .id as number,
    mine: (await create({ name: "Mine", visibility: "private" })).id as number,
  });

  it("keeps each to the people its setting names", async () => {
    const { create, get } = setup({
      friendships: [buildFriendship({ status: "accepted" })],
    });
    const { open, friends, mine } = await lists(create);

    expect((await get(open)).status).toBe(200);
    expect((await get(friends, STRANGER)).status).toBe(404);
    expect((await get(friends, USER_B)).status).toBe(200);
    expect((await get(mine, USER_B)).status).toBe(404);
    expect((await get(mine, USER_A)).status).toBe(200);
  });

  it("counts on a profile only what the viewer may see", async () => {
    const { app, create } = setup({
      friendships: [buildFriendship({ status: "accepted" })],
    });
    await lists(create);
    const names = async (user?: string) => {
      const req = request(app).get("/api/v1/users/devuser/lists");
      const { body } = await (user ? req.set(as(user)) : req);
      return body.data.map((l: { name: string }) => l.name).sort();
    };

    expect(await names()).toEqual(["Open"]);
    expect(await names(USER_B)).toEqual(["Friends", "Open"]);
    expect(await names(USER_A)).toEqual(["Friends", "Mine", "Open"]);
  });

  it("hides every list behind a private profile", async () => {
    const { create, get } = setup();
    const { open } = await lists(create);
    const hidden = setup({
      profiles: [
        buildProfile({ profile_visibility: "private" }),
        buildProfile({ id: STRANGER, username: "stranger" }),
      ],
      gameLists: [],
    });
    const { id } = await hidden.create({ name: "Open" });

    expect((await get(open, STRANGER)).status).toBe(200);
    expect((await hidden.get(id, STRANGER)).status).toBe(404);
  });
});

describe("upvoting a list", () => {
  it("toggles, but not on your own or one you can't see", async () => {
    const { create, vote } = setup();
    const { id } = await create({ name: "Open" });
    const { id: hidden } = await create({ name: "x", visibility: "private" });

    expect((await vote(id, USER_B)).body).toEqual({
      voteCount: 1,
      votedByViewer: true,
    });
    expect((await vote(id, USER_B)).body.voteCount).toBe(0);
    expect((await vote(id, USER_A)).status).toBe(403);
    expect((await vote(hidden, USER_B)).status).toBe(404);
  });

  it("tells its owner at a milestone, and forgets it with the list", async () => {
    const { app, create, vote, state } = setup();
    const { id } = await create({ name: "Open" });
    const voters = Array.from(
      { length: 5 },
      (_, i) => `00000000-0000-0000-0000-${String(i).padStart(12, "0")}`,
    );
    for (const voter of voters) await vote(id, voter);

    const note = state.notifications.find(
      (n) => n.dedupe_key === `list_upvotes:${id}`,
    );
    expect(note).toMatchObject({
      user_id: USER_A,
      kind: "list_upvote_milestone",
    });

    await request(app).delete(`/api/v1/me/lists/${id}`).set(as(USER_A));
    expect(
      state.notifications.some((n) => n.dedupe_key === `list_upvotes:${id}`),
    ).toBe(false);
  });
});

describe("lists beyond a profile", () => {
  it("shows a game's page and Popular only public lists, most upvoted first", async () => {
    const { app, create, vote } = setup();
    const quiet = (await create({ name: "Quiet", gameIds: [1] })).id;
    const loved = (await create({ name: "Loved", gameIds: [1] })).id;
    await create({ name: "Hidden", gameIds: [1], visibility: "friends" });
    await create({ name: "Elsewhere", gameIds: [2] });
    await vote(loved, USER_B);
    expect(quiet).toBeDefined();

    const forGame = await request(app).get("/api/v1/games/1/lists");
    const popular = await request(app).get("/api/v1/lists/popular");

    expect(forGame.body.map((l: { name: string }) => l.name)).toEqual([
      "Loved",
      "Quiet",
    ]);
    expect(popular.body.data.map((l: { name: string }) => l.name)).toEqual([
      "Loved",
      "Elsewhere",
      "Quiet",
    ]);
  });

  it("marks which of your lists already hold a game", async () => {
    const { app, create } = setup();
    await create({ name: "Has it", gameIds: [1] });
    await create({ name: "Doesn't" });

    const { body } = await request(app)
      .get("/api/v1/me/lists?gameId=1")
      .set(as(USER_A));

    expect(
      body.map((l: { name: string; hasGame: boolean }) => [l.name, l.hasGame]),
    ).toEqual([
      ["Doesn't", false],
      ["Has it", true],
    ]);
  });
});

describe("a list and its owner's account", () => {
  it("goes in the export, and goes with the account", async () => {
    const { app, create, vote, state } = setup();
    const { id } = await create({ name: "Mine", gameIds: [1, 2] });
    const { id: theirs } = await create({ name: "Theirs" }, USER_B);
    await vote(theirs, USER_A);

    const exported = await request(app)
      .get("/api/v1/profiles/me/export")
      .set(as(USER_A));
    expect(exported.body.gameLists).toHaveLength(1);
    expect(exported.body.gameListItems).toHaveLength(2);
    expect(exported.body.gameListVotes).toHaveLength(1);

    await request(app).delete("/api/v1/profiles/me").set(as(USER_A));
    expect(state.gameLists.map((l) => l.id)).toEqual([theirs]);
    expect(state.gameListItems.some((i) => i.list_id === id)).toBe(false);
    expect(state.gameListVotes).toEqual([]);
  });
});
