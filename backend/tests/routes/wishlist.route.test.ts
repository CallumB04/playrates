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
  // Games 1 and 2 are RPGs; 2 is indie too.
  gameGenres: [
    { game_id: 1, genre_slug: "rpg" },
    { game_id: 2, genre_slug: "rpg" },
    { game_id: 2, genre_slug: "indie" },
    { game_id: 3, genre_slug: "shooter" },
  ],
});

const as = (user = USER_A) => ({ Authorization: authHeader(user) });

const setup = () => {
  const built = buildTestApp({ seed: seed() });
  const { app } = built;
  const log = (body: object, user = USER_A) =>
    request(app).post("/api/v1/me/logs").set(as(user)).send(body);
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

describe("filtering by genre", () => {
  const shelfTitles = (response: request.Response) =>
    response.body.data.map((e: { game: { title: string } }) => e.game.title);

  it("narrows a shelf to the genre, and lists the genres on it", async () => {
    const { app, log } = setup();
    await log({ gameId: 1, status: "played" });
    await log({ gameId: 2, status: "played" });
    await log({ gameId: 3, status: "played" });
    await log({ gameId: 4, status: "backlog" });

    const shelf = await request(app).get(
      "/api/v1/users/devuser/shelf?status=played&genre=indie",
    );
    const genres = await request(app).get(
      "/api/v1/users/devuser/shelf/genres?status=played",
    );

    expect(shelfTitles(shelf)).toEqual(["Game 2"]);
    expect(genres.body).toEqual(["indie", "rpg", "shooter"]);
  });

  it("works alongside the console and the search", async () => {
    const { app, log } = setup();
    await log({ gameId: 1, status: "played", system: "steam" });
    await log({ gameId: 2, status: "played", system: "switch" });

    const shelf = await request(app).get(
      "/api/v1/users/devuser/shelf?status=played&genre=rpg&system=switch&q=game",
    );
    expect(shelfTitles(shelf)).toEqual(["Game 2"]);
  });

  it("gives each wished-for game its genres, and the wishlist's", async () => {
    const { log, wishlist } = setup();
    await log({ gameId: 2, status: "wishlist" });
    await log({ gameId: 4, status: "wishlist" });

    const page = await wishlist();
    expect(page.data.map((e: { genres: string[] }) => e.genres)).toEqual([
      ["rpg", "indie"],
      [],
    ]);
    expect(page.genres).toEqual(["indie", "rpg"]);
  });
});

describe("filtering by what the viewer has too", () => {
  const shelf = async (
    app: Parameters<typeof request>[0],
    common: string,
    viewer?: string,
  ) => {
    const req = request(app).get(
      `/api/v1/users/devuser/shelf?status=played&common=${common}`,
    );
    const response = viewer ? await req.set(as(viewer)) : await req;
    return response.body.data.map(
      (e: { game: { title: string } }) => e.game.title,
    );
  };

  it("keeps the games both have logged, or theirs alone", async () => {
    const { app, log } = setup();
    await log({ gameId: 1, status: "played" });
    await log({ gameId: 2, status: "played" });
    // Any of the viewer's logs counts, a wishlist one included.
    await log({ gameId: 2, status: "wishlist" }, USER_B);

    expect(await shelf(app, "both", USER_B)).toEqual(["Game 2"]);
    expect(await shelf(app, "theirs", USER_B)).toEqual(["Game 1"]);
  });

  it("means nothing signed out or on your own profile", async () => {
    const { app, log } = setup();
    await log({ gameId: 1, status: "played" });
    await log({ gameId: 2, status: "played" });

    expect(await shelf(app, "both")).toHaveLength(2);
    expect(await shelf(app, "theirs", USER_A)).toHaveLength(2);
  });

  it("refuses a value it doesn't know", async () => {
    const { app } = setup();
    const response = await request(app).get(
      "/api/v1/users/devuser/shelf?status=played&common=mine",
    );
    expect(response.status).toBe(422);
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
