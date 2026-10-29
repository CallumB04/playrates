import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import sharp from "sharp";
import { authHeader, buildTestApp, USER_A } from "../helpers/buildTestApp.js";
import { baseSeed, buildGame, buildProfile } from "../helpers/fixtures.js";

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

const games = [1, 2, 3].map((id) =>
  buildGame({
    id,
    slug: `game-${id}`,
    title: `Game ${id}`,
    box_art_url: `https://images.igdb.com/igdb/image/upload/t_cover_big_2x/co${id}.jpg`,
  }),
);

const setup = (profile: object = {}) => {
  const { app } = buildTestApp({
    seed: { ...baseSeed(), profiles: [buildProfile(profile)], games },
  });
  const create = async (body: object) =>
    (
      await request(app)
        .post("/api/v1/me/lists")
        .set({ Authorization: authHeader(USER_A) })
        .send(body)
    ).body as { id: number };
  const image = (id: number, query = "") =>
    request(app).get(`/api/v1/lists/${id}/image${query}`).buffer(true);
  return { app, create, image };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("a list's shared picture", () => {
  // Draws a picture, which can outlast the default timeout in a full run.
  it("draws a public list, with the covers it could fetch", async () => {
    const jpeg = await sharp({
      create: { width: 3, height: 4, channels: 3, background: "#884422" },
    })
      .jpeg()
      .toBuffer();
    const fetched: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        fetched.push(url);
        return url.includes("co1")
          ? new Response(jpeg, { headers: { "content-type": "image/jpeg" } })
          : new Response("gone", { status: 404 });
      }),
    );
    const { create, image } = setup();
    const list = await create({
      name: "Best of",
      ranked: true,
      gameIds: [1, 2, 3],
    });

    const res = await image(list.id, "?v=1");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("image/png");
    expect(res.headers["cache-control"]).toBe("public, max-age=86400");
    expect(res.headers["cross-origin-resource-policy"]).toBe("cross-origin");
    expect((res.body as Buffer).subarray(0, 4)).toEqual(PNG);
    // Small covers, not the 2x box art the page uses.
    expect(fetched).toContain(
      "https://images.igdb.com/igdb/image/upload/t_cover_big/co1.jpg",
    );
    const { width, height } = await sharp(res.body as Buffer).metadata();
    expect([width, height]).toEqual([1080, 1350]);

    const unversioned = await image(list.id);
    expect(unversioned.headers["cache-control"]).toContain("max-age=300");
  }, 20_000);

  it("isn't drawn for a list only friends or its owner may see", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const { create, image } = setup();
    const friends = await create({ name: "Mates", visibility: "friends" });
    const mine = await create({ name: "Mine", visibility: "private" });

    expect((await image(friends.id)).status).toBe(404);
    expect((await image(mine.id)).status).toBe(404);
  });

  it("isn't drawn for a public list on a profile that isn't", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const { create, image } = setup({ profile_visibility: "friends" });
    const list = await create({ name: "Out there", gameIds: [1] });

    expect((await image(list.id)).status).toBe(404);
  });

  it("isn't drawn for a list that isn't there", async () => {
    const { image } = setup();
    expect((await image(999)).status).toBe(404);
  });
});
