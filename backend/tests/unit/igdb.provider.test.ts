import { describe, expect, it, vi } from "vitest";
import { createIgdbProvider } from "../../src/providers/games/igdb/igdb.provider.js";
import type { IgdbGame } from "../../src/providers/games/igdb/igdb.mapper.js";

const game = (id: number, ratings = 0): IgdbGame => ({
  id,
  name: `Game ${id}`,
  slug: `game-${id}`,
  total_rating_count: ratings,
});

/** A fake Twitch and IGDB: hands out tokens, and answers each games query
 *  from the queue of responses given. */
const upstream = (responses: (() => Response)[], editions = false) => {
  let tokens = 0;
  const queries: { body: string; auth: string | null }[] = [];
  const fetchImpl = vi.fn(async (input: string | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.startsWith("https://id.twitch.tv/")) {
      tokens += 1;
      return Response.json({ access_token: `token-${tokens}`, expires_in: 5_000_000 });
    }
    // The edition-cover lookup that follows every listing: no editions,
    // unless a test queues them itself.
    if (String(init?.body).includes("where version_parent = (") && !editions) {
      return Response.json([]);
    }
    queries.push({
      body: String(init?.body),
      auth: new Headers(init?.headers).get("Authorization"),
    });
    const next = responses.shift();
    if (!next) throw new Error("no response queued");
    return next();
  }) as unknown as typeof fetch;
  return { fetchImpl, queries, tokens: () => tokens };
};

describe("IGDB provider", () => {
  it("signs in once and reuses the token", async () => {
    const api = upstream([
      () => Response.json([game(1)]),
      () => Response.json([game(2)]),
    ]);
    const igdb = createIgdbProvider("id", "secret", api.fetchImpl);

    await igdb.getById(1);
    await igdb.getById(2);

    expect(api.tokens()).toBe(1);
    expect(api.queries.map((q) => q.auth)).toEqual([
      "Bearer token-1",
      "Bearer token-1",
    ]);
  });

  it("gets a new token when IGDB says the old one is no good", async () => {
    const api = upstream([
      () => new Response(null, { status: 401 }),
      () => Response.json([game(1)]),
    ]);
    const igdb = createIgdbProvider("id", "secret", api.fetchImpl);

    const found = await igdb.getById(1);

    expect(found?.externalId).toBe(1);
    expect(api.queries.map((q) => q.auth)).toEqual([
      "Bearer token-1",
      "Bearer token-2",
    ]);
  });

  it("waits and retries when throttled, and counts every attempt", async () => {
    const api = upstream([
      () => new Response(null, { status: 429 }),
      () => Response.json([game(1)]),
    ]);
    const onRequest = vi.fn();
    const igdb = createIgdbProvider("id", "secret", api.fetchImpl, { onRequest });

    await igdb.getById(1);

    // The throttled attempt, its retry, then the edition-cover lookup.
    expect(onRequest.mock.calls.map(([o]) => o)).toEqual([
      { failed: true, error: "IGDB responded 429" },
      { failed: false, error: null },
      { failed: false, error: null },
    ]);
  });

  it("tries again after a dropped connection", async () => {
    const api = upstream([
      () => {
        throw new TypeError("fetch failed");
      },
      () => Response.json([game(1)]),
    ]);
    const igdb = createIgdbProvider("id", "secret", api.fetchImpl);

    expect((await igdb.getById(1))?.externalId).toBe(1);
  });

  it("gives up on a request IGDB refuses outright", async () => {
    const api = upstream([() => new Response("bad query", { status: 400 })]);
    const igdb = createIgdbProvider("id", "secret", api.fetchImpl);

    await expect(igdb.getById(1)).rejects.toThrow("status 400");
  });

  it("returns null for an id IGDB doesn't have", async () => {
    const api = upstream([() => Response.json([])]);
    const igdb = createIgdbProvider("id", "secret", api.fetchImpl);

    expect(await igdb.getById(404)).toBeNull();
  });

  it("orders search results best known first, quoting the term", async () => {
    const api = upstream([
      () => Response.json([game(1, 5), game(2, 900), game(3, 40)]),
    ]);
    const igdb = createIgdbProvider("id", "secret", api.fetchImpl);

    const found = await igdb.search('the "witcher"', 2);

    expect(found.map((g) => g.externalId)).toEqual([2, 3]);
    expect(api.queries[0]!.body).toContain('search "the \\"witcher\\"";');
    expect(api.queries[0]!.body).toContain("game_type = (0,4,8,9,10)");
  });

  it("pages the catalogue best known first, and knows a short page is the last", async () => {
    const api = upstream([
      () => Response.json([game(1), game(2)]),
      () => Response.json([game(3)]),
    ]);
    const igdb = createIgdbProvider("id", "secret", api.fetchImpl);

    const first = await igdb.listByPopularity(1, 2);
    const second = await igdb.listByPopularity(2, 2);

    expect(first.hasNext).toBe(true);
    expect(second).toMatchObject({ hasNext: false, total: 3 });
    expect(api.queries[0]!.body).toContain(
      "sort total_rating_count desc; limit 2; offset 0;",
    );
    expect(api.queries[1]!.body).toContain("offset 2;");
  });

  it("adds each game's edition covers, from one more request for the batch", async () => {
    const api = upstream(
      [
        () => Response.json([{ ...game(1942), cover: { image_id: "main" } }]),
        () =>
          Response.json([
            { version_parent: 1942, version_title: "Complete Edition", name: "x", cover: { image_id: "co5uct" } },
            { version_parent: 1942, name: "The Witcher 3 - GOTY", cover: { image_id: "co1wz4" } },
          ]),
      ],
      true,
    );
    const igdb = createIgdbProvider("id", "secret", api.fetchImpl);

    const found = await igdb.getById(1942);

    expect(found?.altCovers).toEqual([
      { imageId: "co5uct", label: "Complete Edition" },
      { imageId: "co1wz4", label: "The Witcher 3 - GOTY" },
    ]);
    expect(api.queries[1]!.body).toContain("where version_parent = (1942) & cover != null");
  });

  it("takes what is trending from Steam's players over the last day", async () => {
    const api = upstream([
      () => Response.json([{ game_id: 30 }, { game_id: 10 }]),
    ]);
    const igdb = createIgdbProvider("id", "secret", api.fetchImpl);

    expect(await igdb.trendingIds(200)).toEqual([30, 10]);
    expect(api.queries[0]!.body).toBe(
      "fields game_id; where popularity_type = 5; sort value desc; limit 200;",
    );
  });

  it("re-reads just the banner for a batch of games", async () => {
    const api = upstream([
      () =>
        Response.json([
          {
            id: 1,
            artworks: [{ image_id: "ar1" }],
            screenshots: [{ image_id: "sc1" }],
          },
          { id: 2 },
        ]),
    ]);
    const igdb = createIgdbProvider("id", "secret", api.fetchImpl);

    const banners = await igdb.bannersOf([1, 2]);

    expect(banners.get(1)).toContain("/sc1.jpg");
    expect(banners.get(2)).toBeNull();
    expect(api.queries[0]!.body).toBe(
      "fields screenshots.image_id,artworks.image_id; where id = (1,2); limit 500;",
    );
  });

  it("re-reads just the series for a batch of games", async () => {
    const api = upstream([
      () =>
        Response.json([
          { id: 1, franchises: [{ id: 596, name: "The Legend of Zelda" }] },
          { id: 2 },
        ]),
    ]);
    const igdb = createIgdbProvider("id", "secret", api.fetchImpl);

    const series = await igdb.seriesOf([1, 2]);

    expect(series.get(1)).toEqual({ id: -596, name: "The Legend of Zelda" });
    expect(series.get(2)).toBeNull();
    expect(api.queries[0]!.body).toBe(
      "fields franchises.name,collections.name; where id = (1,2); limit 500;",
    );
  });

  it("pages the catalogue by rating only among games that have one", async () => {
    const api = upstream([() => Response.json([])]);
    const igdb = createIgdbProvider("id", "secret", api.fetchImpl);

    await igdb.listByPopularity(1, 500);

    expect(api.queries[0]!.body).toContain("& total_rating_count > 0;");
  });

  it("lists the most visited games in visit order, through the catalogue filter", async () => {
    const api = upstream([
      () => Response.json([{ game_id: 30 }, { game_id: 10 }, { game_id: 20 }]),
      // 20 was a DLC, so the filter left it out; the rest come back unordered
      () => Response.json([game(10), game(30)]),
    ]);
    const igdb = createIgdbProvider("id", "secret", api.fetchImpl);

    const page = await igdb.listMostVisited(1, 3);

    expect(page.games.map((g) => g.externalId)).toEqual([30, 10]);
    expect(page.hasNext).toBe(true);
    expect(api.queries[0]!.body).toContain("where popularity_type = 1; sort value desc; limit 3; offset 0;");
    expect(api.queries[1]!.body).toContain("& id = (30,10,20)");
  });

  it("asks for a release window in IGDB's unix seconds, end day included", async () => {
    const api = upstream([() => Response.json([])]);
    const igdb = createIgdbProvider("id", "secret", api.fetchImpl);

    await igdb.listByDate({
      from: "2026-01-01",
      to: "2026-01-31",
      page: 1,
      pageSize: 500,
    });

    expect(api.queries[0]!.body).toContain(
      "first_release_date >= 1767225600 & first_release_date < 1769904000",
    );
  });
});
