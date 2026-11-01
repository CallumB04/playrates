import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import request from "supertest";
import { buildTestApp, USER_A, USER_B } from "../helpers/buildTestApp.js";
import {
  baseSeed,
  buildGame,
  buildMessage,
  buildGameLog,
  buildProfile,
  buildReview,
  buildThread,
  doc,
} from "../helpers/fixtures.js";
import { SITE_CSP } from "../../src/config/siteHeaders.js";

describe("rendered pages", () => {
  it("gives a game page its own title, description and picture", async () => {
    const { app } = buildTestApp({
      seed: {
        ...baseSeed(),
        games: [buildGame({ avg_rating: 8.5, rating_count: 4 })],
      },
    });

    const response = await request(app).get("/game/1");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toMatch(/text\/html/);
    expect(response.text).toContain(
      "<title>The Witcher 3: Wild Hunt (2015) / PlayRates</title>",
    );
    expect(response.text).toContain(
      "The Witcher 3: Wild Hunt (2015) on Steam. Rated 8.5/10 from 4 ratings on PlayRates.",
    );
    expect(response.text).toContain(
      '<meta property="og:image" content="https://example.test/cover.jpg" />',
    );
    expect(response.text).toContain('"@type":"AggregateRating"');
    expect(response.text).toContain(
      '<div id="root"><article class="prerender"><h1>The Witcher 3: Wild Hunt</h1>',
    );
  });

  it("carries the site's CSP rather than the API's", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app).get("/game/1");

    expect(response.headers["content-security-policy"]).toBe(SITE_CSP);
    expect(response.headers["x-frame-options"]).toBe("DENY");
  });

  it("keeps an adult game out of search and its art out of previews", async () => {
    const { app } = buildTestApp({
      seed: { ...baseSeed(), games: [buildGame({ has_sexual_content: true })] },
    });

    const response = await request(app).get("/game/1");

    expect(response.text).toContain('<meta name="robots" content="noindex" />');
    expect(response.text).not.toContain('example.test/cover.jpg" />');
  });

  it("404s a game that isn't there, and asks not to be indexed", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    for (const path of ["/game/999", "/game/abc"]) {
      const response = await request(app).get(path);
      expect(response.status, path).toBe(404);
      expect(response.text).toContain(
        "<title>Page not found / PlayRates</title>",
      );
      expect(response.text).toContain('content="noindex"');
    }
  });

  it("uses a profile's bio, and honours hiding from search", async () => {
    const { app } = buildTestApp({
      seed: {
        ...baseSeed(),
        profiles: [
          buildProfile({
            bio: 'Soulslikes & "cozy" games',
            hide_from_search: true,
          }),
        ],
      },
    });

    const response = await request(app).get("/user/devuser");

    expect(response.text).toContain("<title>devuser / PlayRates</title>");
    expect(response.text).toContain(
      'content="Soulslikes &amp; &quot;cozy&quot; games"',
    );
    expect(response.text).toContain('<meta name="robots" content="noindex" />');
  });

  it("previews a profile's views as the profile, and 404s any other", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const view = await request(app).get("/user/devuser/reviews");
    expect(view.status).toBe(200);
    expect(view.text).toContain("<title>devuser / PlayRates</title>");

    const unknown = await request(app).get("/user/devuser/trophies");
    expect(unknown.status).toBe(404);
  });

  it("asks search engines to leave a private or friends-only profile out", async () => {
    for (const visibility of ["private", "friends"]) {
      const { app } = buildTestApp({
        seed: {
          ...baseSeed(),
          profiles: [buildProfile({ profile_visibility: visibility })],
        },
      });
      const response = await request(app).get("/user/devuser");
      expect(response.text).toContain(
        '<meta name="robots" content="noindex" />',
      );
    }
  });

  it("asks search engines to leave out a thread about an adult game", async () => {
    const { app } = buildTestApp({
      seed: {
        ...baseSeed(),
        games: [buildGame({ id: 1, has_sexual_content: true })],
        communityThreads: [buildThread({ game_id: 1 })],
      },
    });
    const response = await request(app).get("/community/thread/1");
    expect(response.text).toContain('<meta name="robots" content="noindex" />');
  });

  it("describes a thread by its opening message, escaped", async () => {
    const { app } = buildTestApp({
      seed: {
        ...baseSeed(),
        communityThreads: [
          buildThread({ title: "</title><script>alert(1)</script>" }),
        ],
        communityMessages: [
          buildMessage({
            id: 1,
            is_opening: true,
            author_id: USER_A,
            body: doc("Which ending did you get?"),
          }),
        ],
      },
    });

    const response = await request(app).get("/community/thread/1");

    expect(response.text).not.toContain("<script>alert(1)</script>");
    expect(response.text).toContain(
      '<meta name="description" content="Which ending did you get?" />',
    );
  });

  it("tells crawlers to stay away from anything but the live site", async () => {
    const preview = buildTestApp({ seed: baseSeed() });
    const live = buildTestApp({ seed: baseSeed(), production: true });

    expect(
      (await request(preview.app).get("/game/1")).headers["x-robots-tag"],
    ).toBe("noindex");
    expect(
      (await request(live.app).get("/game/1")).headers["x-robots-tag"],
    ).toBeUndefined();
    expect((await request(preview.app).get("/robots.txt")).text).toContain(
      "Disallow: /\n",
    );
    expect((await request(live.app).get("/robots.txt")).text).toContain(
      "Sitemap: https://playrates.app/sitemap.xml",
    );
  });
});

describe("the sitemap", () => {
  const seed = () => ({
    ...baseSeed(),
    games: [
      buildGame({ id: 1, updated_at: "2026-09-01T10:00:00Z" }),
      buildGame({ id: 2, has_sexual_content: true }),
    ],
    communityThreads: [buildThread({ id: 7 })],
  });

  it("indexes the pages, the threads and the catalogue", async () => {
    const { app } = buildTestApp({ seed: seed(), production: true });

    const response = await request(app).get("/sitemap.xml");

    expect(response.headers["content-type"]).toMatch(/application\/xml/);
    expect(response.text).toContain(
      "<loc>https://playrates.app/sitemaps/games-1.xml</loc>",
    );
    expect(response.text).toContain(
      "<loc>https://playrates.app/sitemaps/threads.xml</loc>",
    );
  });

  it("lists games, leaving adult ones out", async () => {
    const { app } = buildTestApp({ seed: seed(), production: true });

    const response = await request(app).get("/sitemaps/games-1.xml");

    expect(response.text).toContain(
      "<loc>https://playrates.app/game/1</loc><lastmod>2026-09-01</lastmod>",
    );
    expect(response.text).not.toContain("/game/2<");
  });

  it("lists public profiles, and nobody who'd rather not be found", async () => {
    const { app } = buildTestApp({
      seed: {
        ...seed(),
        profiles: [
          buildProfile({ id: USER_A, username: "devuser" }),
          buildProfile({
            id: USER_B,
            username: "quietone",
            hide_from_search: true,
          }),
        ],
      },
      production: true,
    });

    expect((await request(app).get("/sitemap.xml")).text).toContain(
      "<loc>https://playrates.app/sitemaps/people.xml</loc>",
    );
    const people = (await request(app).get("/sitemaps/people.xml")).text;
    expect(people).toContain("<loc>https://playrates.app/user/devuser</loc>");
    expect(people).not.toContain("quietone");
  });

  it("404s a page of games past the end", async () => {
    const { app } = buildTestApp({ seed: seed(), production: true });

    expect((await request(app).get("/sitemaps/games-2.xml")).status).toBe(404);
  });

  it("lists threads and the fixed pages", async () => {
    const { app } = buildTestApp({
      seed: {
        ...seed(),
        communityThreads: [
          buildThread({ id: 7, game_id: 1 }),
          buildThread({ id: 8, game_id: 2 }),
        ],
      },
      production: true,
    });

    const threads = (await request(app).get("/sitemaps/threads.xml")).text;
    expect(threads).toContain("https://playrates.app/community/thread/7");
    // About an adult game: left out, as the game is.
    expect(threads).not.toContain("https://playrates.app/community/thread/8");
    expect((await request(app).get("/sitemaps/pages.xml")).text).toContain(
      "<loc>https://playrates.app/privacy</loc>",
    );
  });
});

/* Most AI crawlers read the HTML and never run the app, so an empty #root
   told them nothing past the head. */
describe("page content for readers that never run the app", () => {
  const root = (html: string) =>
    html.slice(html.indexOf('<div id="root">'), html.indexOf("</body>"));

  const reviewed = () => ({
    ...baseSeed(),
    games: [buildGame({ avg_rating: 8.5, rating_count: 4, log_count: 6 })],
    gameLogs: [
      buildGameLog({ id: 1, user_id: USER_A, rating: 9 }),
      buildGameLog({ id: 2, user_id: USER_B, rating: 7 }),
    ],
    reviews: [
      buildReview({
        id: 1,
        log_id: 1,
        user_id: USER_A,
        body: "A <b>classic</b>.",
      }),
      buildReview({
        id: 2,
        log_id: 2,
        user_id: USER_B,
        body: "The ending is that Geralt",
        contains_spoilers: true,
      }),
    ],
  });

  it("writes out a game's facts, description and reviews", async () => {
    const { app } = buildTestApp({ seed: reviewed() });
    const html = root((await request(app).get("/game/1")).text);

    expect(html).toContain("<h1>The Witcher 3: Wild Hunt</h1>");
    expect(html).toContain("<dt>Platforms</dt><dd>Steam</dd>");
    expect(html).toContain(
      "<dt>PlayRates rating</dt><dd>8.5/10 from 4 ratings</dd>",
    );
    expect(html).toContain("<dt>Critic score</dt><dd>92/100</dd>");
    expect(html).toContain("<p>An open world RPG.</p>");
    expect(html).toContain("<strong>devuser</strong> · 9.0/10");
    // Escaped: a review is written by a user.
    expect(html).toContain("A &lt;b&gt;classic&lt;/b&gt;.");
  });

  it("keeps a spoiler's text and a private author's name to themselves", async () => {
    const seed = reviewed();
    seed.profiles = [
      seed.profiles[0]!,
      buildProfile({
        id: USER_B,
        username: "frienduser",
        profile_visibility: "friends",
      }),
    ];
    const { app } = buildTestApp({ seed });
    const html = root((await request(app).get("/game/1")).text);

    expect(html).not.toContain("Geralt");
    expect(html).toContain("Contains spoilers.");
    expect(html).not.toContain("frienduser");
    expect(html).toContain("<strong>A private account</strong>");
  });

  it("says nothing more about an adult game", async () => {
    const { app } = buildTestApp({
      seed: { ...baseSeed(), games: [buildGame({ has_sexual_content: true })] },
    });
    expect((await request(app).get("/game/1")).text).toContain(
      '<div id="root"></div>',
    );
  });

  it("gives a public profile its bio and reviews, a private one its name", async () => {
    const open = buildTestApp({
      seed: {
        ...reviewed(),
        profiles: [buildProfile({ bio: "Soulslikes only." })],
      },
    });
    const openHtml = root((await request(open.app).get("/user/devuser")).text);
    expect(openHtml).toContain("<p>Soulslikes only.</p>");
    expect(openHtml).toContain("<strong>The Witcher 3: Wild Hunt</strong>");

    const closed = buildTestApp({
      seed: {
        ...reviewed(),
        profiles: [
          buildProfile({
            bio: "Soulslikes only.",
            profile_visibility: "private",
          }),
        ],
      },
    });
    const closedHtml = root(
      (await request(closed.app).get("/user/devuser")).text,
    );
    expect(closedHtml).toContain("This profile is private.");
    expect(closedHtml).not.toContain("Soulslikes");
    expect(closedHtml).not.toContain("Witcher");
  });

  it("leaves a profile hidden from search empty", async () => {
    const { app } = buildTestApp({
      seed: {
        ...baseSeed(),
        profiles: [buildProfile({ hide_from_search: true })],
      },
    });
    expect((await request(app).get("/user/devuser")).text).toContain(
      '<div id="root"></div>',
    );
  });

  it("writes out a thread's opening post and replies, spoilers hidden", async () => {
    const { app } = buildTestApp({
      seed: {
        ...baseSeed(),
        communityThreads: [buildThread()],
        communityMessages: [
          buildMessage({
            id: 1,
            is_opening: true,
            body: doc("Which side quest stayed with you?"),
          }),
          buildMessage({
            id: 2,
            author_id: USER_B,
            body: doc("The Bloody Baron, easily."),
          }),
          buildMessage({
            id: 3,
            author_id: USER_B,
            deleted_at: "2026-01-01T00:00:00Z",
            body: null,
          }),
        ],
      },
    });
    const html = root((await request(app).get("/community/thread/1")).text);

    expect(html).toContain("<h1>Best side quest?</h1>");
    expect(html).toContain(
      "A thread about The Witcher 3: Wild Hunt started by devuser",
    );
    expect(html).toContain("<p>Which side quest stayed with you?</p>");
    expect(html).toContain("<strong>frienduser</strong>");
    expect(html).toContain("The Bloody Baron, easily.");
    // The deleted reply leaves no row behind.
    expect(html.match(/<li>/g)).toHaveLength(1);
  });
});

describe("every other page", () => {
  it("gives a fixed page its own title and canonical", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app).get("/privacy");

    expect(response.status).toBe(200);
    expect(response.text).toContain("<title>Privacy / PlayRates</title>");
    expect(response.text).toContain(
      '<link rel="canonical" href="https://playrates.app/privacy" />',
    );
    expect(response.headers["cache-control"]).toContain("s-maxage");
  });

  it("asks search engines to leave out someone's own pages", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    for (const path of ["/settings", "/progress", "/admin/errors"]) {
      const response = await request(app).get(path);
      expect(response.status, path).toBe(200);
      expect(response.text, path).toContain(
        '<meta name="robots" content="noindex" />',
      );
    }
  });

  it("answers an address the app doesn't have with a real 404", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app).get("/no-such-page");

    expect(response.status).toBe(404);
    expect(response.text).toContain(
      "<title>Page not found / PlayRates</title>",
    );
    expect(response.text).toContain('<meta name="robots" content="noindex" />');
  });

  it("sends the old /catalogue on to the library, filters and all", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app).get("/catalogue?genre=rpg");

    expect(response.status).toBe(301);
    expect(response.headers.location).toBe("/library?genre=rpg");
  });

  it("leaves the API's CORS preflights to the API", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app)
      .options("/api/v1/games")
      .set("Origin", "http://localhost:5173")
      .set("Access-Control-Request-Method", "GET");

    expect(response.headers["access-control-allow-origin"]).toBe(
      "http://localhost:5173",
    );
  });

  it("leaves the API to the API", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    const response = await request(app).get("/api/v1/no-such-endpoint");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("not_found");
  });

  /* The app's routes are in App.tsx; a new one there without a page here
     would be served as a 404. */
  it("has a page for every route in the app", async () => {
    const appSource = readFileSync(
      new URL("../../../frontend/src/App.tsx", import.meta.url),
      "utf8",
    );
    const paths = [...appSource.matchAll(/path="([^"]+)"/g)].map((m) => m[1]!);
    const { app } = buildTestApp({
      seed: {
        ...baseSeed(),
        games: [buildGame({ id: 1 })],
        communityThreads: [buildThread({ id: 1 })],
      },
    });

    const sample = (path: string) =>
      path
        .replace(":username", "devuser")
        .replace(":targetUsername?", "devuser")
        .replace("/:view?", "/games")
        .replace(":gameID", "1")
        .replace(":threadId", "1")
        .replace("/*", "/anything");

    const checked = paths.filter(
      // The catch-all, and a list, which needs one of its own to exist.
      (path) => path !== "*" && !path.includes(":listId"),
    );
    expect(checked.length).toBeGreaterThan(15);
    for (const path of checked) {
      const response = await request(app).get(sample(path));
      expect([200, 301], `${path} -> ${sample(path)}`).toContain(
        response.status,
      );
    }
  });
});

describe("list and Gaming 25 pages for readers that never run the app", () => {
  it("writes out a public list's games in its order", async () => {
    const { app } = buildTestApp({
      seed: {
        ...baseSeed(),
        games: [
          buildGame({
            id: 1,
            title: "Outer Wilds",
            release_date: "2019-05-28",
          }),
          buildGame({ id: 2, title: "Celeste", release_date: "2018-01-25" }),
          buildGame({ id: 3, title: "Hidden One", has_sexual_content: true }),
        ],
        gameLists: [
          {
            id: 1,
            user_id: USER_A,
            name: "Best of",
            description: "Short and perfect.",
            visibility: "everyone",
            colour: null,
            ranked: true,
            cover_game_ids: [],
            created_at: "2026-10-01T00:00:00.000Z",
            updated_at: "2026-10-02T00:00:00.000Z",
          },
        ],
        gameListItems: [
          {
            list_id: 1,
            game_id: 2,
            position: 2,
            added_at: "2026-10-01T00:00:00.000Z",
          },
          {
            list_id: 1,
            game_id: 1,
            position: 1,
            added_at: "2026-10-01T00:00:00.000Z",
          },
          {
            list_id: 1,
            game_id: 3,
            position: 3,
            added_at: "2026-10-01T00:00:00.000Z",
          },
        ],
      },
    });

    const html = (await request(app).get("/user/devuser/lists/1")).text;
    const body = html.slice(html.indexOf('<div id="root">'));

    expect(body).toContain("Best of");
    expect(body).toContain("Short and perfect.");
    expect(body.indexOf("1. Outer Wilds")).toBeLessThan(
      body.indexOf("2. Celeste"),
    );
    expect(body).not.toContain("Hidden One");
  });
});

describe("structured data", () => {
  const jsonLd = (html: string) =>
    [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)]
      .map((m) => JSON.parse(m[1]!) as Record<string, unknown>)
      .find((d) => d["@type"] !== "Organization" && d["@type"] !== "WebSite");

  it("describes a game with its genres, makers and a trail", async () => {
    const { app } = buildTestApp({
      seed: {
        ...baseSeed(),
        games: [
          buildGame({
            id: 1,
            title: "Hades",
            description: "Fight out of hell.",
            developers: ["Supergiant Games"],
            publishers: ["Supergiant Games"],
          }),
        ],
      },
    });

    const data = jsonLd((await request(app).get("/game/1")).text)!;
    const graph = data["@graph"] as Record<string, unknown>[];
    const game = graph.find((d) => d["@type"] === "VideoGame")!;
    expect(game).toMatchObject({
      name: "Hades",
      description: "Fight out of hell.",
      author: [{ "@type": "Organization", name: "Supergiant Games" }],
    });
    expect(graph.find((d) => d["@type"] === "BreadcrumbList")).toBeDefined();
  });

  it("calls a thread a forum post, and a public profile a profile page", async () => {
    const { app } = buildTestApp({
      seed: {
        ...baseSeed(),
        games: [buildGame({ id: 1, title: "Hades" })],
        communityThreads: [buildThread({ id: 1, game_id: 1 })],
      },
    });

    const thread = jsonLd(
      (await request(app).get("/community/thread/1")).text,
    )!;
    expect(thread["@type"]).toBe("DiscussionForumPosting");
    expect(thread.about).toMatchObject({ name: "Hades" });

    const profile = jsonLd((await request(app).get("/user/devuser")).text)!;
    expect(profile["@type"]).toBe("ProfilePage");
  });

  it("says nothing about a profile that isn't public", async () => {
    const { app } = buildTestApp({
      seed: {
        ...baseSeed(),
        profiles: [buildProfile({ profile_visibility: "private" })],
      },
    });
    expect(
      jsonLd((await request(app).get("/user/devuser")).text),
    ).toBeUndefined();
  });
});
