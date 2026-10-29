import { describe, expect, it } from "vitest";
import request from "supertest";
import {
  authHeader,
  buildTestApp,
  USER_A,
  USER_B,
} from "../helpers/buildTestApp.js";
import { baseSeed, buildGame } from "../helpers/fixtures.js";

const games = [1, 2, 3, 4].map((id) =>
  buildGame({ id, slug: `game-${id}`, title: `Game ${id}` }),
);

const seed = () => ({
  ...baseSeed(),
  games,
  gameSystems: games.flatMap((g) => [
    { game_id: g.id, system_slug: "steam" },
    { game_id: g.id, system_slug: "switch" },
  ]),
});

const as = (user = USER_A) => ({ Authorization: authHeader(user) });

const setup = () => {
  const built = buildTestApp({ seed: seed() });
  const { app } = built;
  const log = (body: object) =>
    request(app).post("/api/v1/me/logs").set(as()).send(body);
  const wishlist = async (query = "") =>
    (await request(app).get(`/api/v1/users/devuser/wishlist${query}`)).body;
  const order = (gameIds: number[]) =>
    request(app).put("/api/v1/me/wishlist/order").set(as()).send({ gameIds });
  return { ...built, log, wishlist, order };
};

const titles = (page: { data: { game: { title: string } }[] }) =>
  page.data.map((e) => e.game.title);

describe("a wishlist's order", () => {
  it("puts each game newly wished for at the bottom", async () => {
    const { log, wishlist } = setup();
    await log({ gameId: 3, status: "wishlist", system: "steam" });
    await log({ gameId: 1, status: "wishlist", system: "steam" });
    await log({ gameId: 2, status: "wishlist" });

    const page = await wishlist();
    expect(titles(page)).toEqual(["Game 3", "Game 1", "Game 2"]);
    expect(page.data.map((e: { rank: number }) => e.rank)).toEqual([1, 2, 3]);
  });

  it("keeps a game in one place, with every console it's wished for", async () => {
    const { log, wishlist } = setup();
    await log({ gameId: 1, status: "wishlist", system: "steam" });
    await log({ gameId: 2, status: "wishlist", system: "steam" });
    await log({ gameId: 1, status: "wishlist", system: "switch" });

    const page = await wishlist();
    expect(titles(page)).toEqual(["Game 1", "Game 2"]);
    expect(page.data[0].consoles.sort()).toEqual(["steam", "switch"]);
  });

  it("counts only the consoles it's wished for, not ones it's played on", async () => {
    const { log, wishlist } = setup();
    await log({ gameId: 1, status: "played", system: "steam" });
    await log({ gameId: 1, status: "wishlist", system: "switch" });

    expect((await wishlist()).data[0].consoles).toEqual(["switch"]);
  });

  it("drops a game once its last wish goes, and a new one goes last again", async () => {
    const { app, log, wishlist } = setup();
    const first = await log({ gameId: 1, status: "wishlist", system: "steam" });
    await log({ gameId: 2, status: "wishlist", system: "steam" });

    await request(app)
      .patch(`/api/v1/me/logs/${first.body.id}`)
      .set(as())
      .send({ status: "played" });
    await log({ gameId: 1, status: "wishlist", system: "switch" });

    expect(titles(await wishlist())).toEqual(["Game 2", "Game 1"]);
  });

  it("takes a new order of the whole wishlist", async () => {
    const { log, wishlist, order } = setup();
    for (const gameId of [1, 2, 3]) {
      await log({ gameId, status: "wishlist", system: "steam" });
    }

    const response = await order([3, 1, 2]);

    expect(response.status).toBe(204);
    expect(titles(await wishlist())).toEqual(["Game 3", "Game 1", "Game 2"]);
  });

  /* A tab left open since a game was added must not drop it. */
  it("refuses an order that isn't the whole wishlist", async () => {
    const { log, order } = setup();
    for (const gameId of [1, 2, 3]) {
      await log({ gameId, status: "wishlist", system: "steam" });
    }

    expect((await order([3, 1])).status).toBe(422);
    expect((await order([3, 1, 2, 4])).status).toBe(422);
    expect((await order([3, 1, 1])).status).toBe(422);
  });

  it("needs its owner to change it", async () => {
    const { app } = setup();
    const response = await request(app)
      .put("/api/v1/me/wishlist/order")
      .send({ gameIds: [] });
    expect(response.status).toBe(401);
  });
});

describe("filtering by console", () => {
  it("narrows the wishlist and keeps each game's own rank", async () => {
    const { log, wishlist } = setup();
    await log({ gameId: 1, status: "wishlist", system: "steam" });
    await log({ gameId: 2, status: "wishlist", system: "switch" });
    await log({ gameId: 3, status: "wishlist", system: "switch" });

    const page = await wishlist("?system=switch");
    expect(titles(page)).toEqual(["Game 2", "Game 3"]);
    expect(page.data.map((e: { rank: number }) => e.rank)).toEqual([2, 3]);
    expect(page.total).toBe(3);
    expect(page.consoles).toEqual(["steam", "switch"]);
  });

  it("narrows a shelf to games logged there on that console", async () => {
    const { app, log } = setup();
    await log({ gameId: 1, status: "played", system: "steam" });
    await log({ gameId: 2, status: "played", system: "switch" });
    // On the wishlist for Steam, which says nothing of the played shelf.
    await log({ gameId: 3, status: "wishlist", system: "steam" });

    const shelf = await request(app).get(
      "/api/v1/users/devuser/shelf?status=played&system=steam",
    );
    const consoles = await request(app).get(
      "/api/v1/users/devuser/shelf/consoles?status=played",
    );

    expect(
      shelf.body.data.map((e: { game: { title: string } }) => e.game.title),
    ).toEqual(["Game 1"]);
    expect(consoles.body).toEqual(["steam", "switch"]);
  });
});

describe("who sees a wishlist", () => {
  it("is part of the profile past its card", async () => {
    const { app } = buildTestApp({
      seed: {
        ...seed(),
        profiles: seed().profiles.map((p) =>
          p.id === USER_A ? { ...p, profile_visibility: "private" } : p,
        ),
      },
    });

    const stranger = await request(app)
      .get("/api/v1/users/devuser/wishlist")
      .set(as(USER_B));
    const owner = await request(app)
      .get("/api/v1/users/devuser/wishlist")
      .set(as(USER_A));

    expect(stranger.status).toBe(403);
    expect(owner.status).toBe(200);
  });
});
