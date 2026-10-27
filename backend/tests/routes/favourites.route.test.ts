import { describe, expect, it } from "vitest";
import request from "supertest";
import { authHeader, buildTestApp, USER_A } from "../helpers/buildTestApp.js";
import { baseSeed, buildGame } from "../helpers/fixtures.js";

const games = Array.from({ length: 6 }, (_, i) =>
  buildGame({ id: i + 1, slug: `game-${i + 1}`, title: `Game ${i + 1}` }),
);

const setup = (extra: object = {}) =>
  buildTestApp({ seed: { ...baseSeed(), games, ...extra } }).app;

const put = (app: ReturnType<typeof setup>, gameIds: number[]) =>
  request(app)
    .put("/api/v1/me/favourites")
    .set("Authorization", authHeader(USER_A))
    .send({ gameIds });

describe("favourite games", () => {
  it("keeps up to five, in the order given, and shows them on the profile", async () => {
    const app = setup();

    const saved = await put(app, [3, 1, 5]);
    const shown = await request(app).get("/api/v1/users/devuser/favourites");

    expect(saved.status).toBe(200);
    const titles = (r: request.Response) =>
      r.body.map((g: { title: string }) => g.title);
    expect(titles(saved)).toEqual(["Game 3", "Game 1", "Game 5"]);
    expect(titles(shown)).toEqual(["Game 3", "Game 1", "Game 5"]);
  });

  it("replaces them, and empties them", async () => {
    const app = setup();
    await put(app, [1, 2]);

    await put(app, [4]);
    expect(
      (await request(app).get("/api/v1/users/devuser/favourites")).body,
    ).toHaveLength(1);

    await put(app, []);
    expect(
      (await request(app).get("/api/v1/users/devuser/favourites")).body,
    ).toEqual([]);
  });

  it("refuses six, or a game twice", async () => {
    const app = setup();
    expect((await put(app, [1, 2, 3, 4, 5, 6])).status).toBe(422);
    expect((await put(app, [1, 1])).status).toBe(422);
  });

  it("refuses a game that isn't there", async () => {
    expect((await put(setup(), [1, 999])).status).toBe(404);
  });

  /* A profile is shown to people who have chosen not to see adult games. */
  it("refuses an adult game", async () => {
    const app = setup({
      games: [
        ...games,
        buildGame({ id: 7, slug: "x", has_sexual_content: true }),
      ],
    });
    expect((await put(app, [7])).status).toBe(422);
  });

  it("needs a signed-in owner to change them", async () => {
    const response = await request(setup())
      .put("/api/v1/me/favourites")
      .send({ gameIds: [1] });
    expect(response.status).toBe(401);
  });
});
