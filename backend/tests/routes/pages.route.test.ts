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

    const unknown = await request(app).get("/user/devuser/lists");
    expect(unknown.status).toBe(404);
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

  it("404s a page of games past the end", async () => {
    const { app } = buildTestApp({ seed: seed(), production: true });

    expect((await request(app).get("/sitemaps/games-2.xml")).status).toBe(404);
  });

  it("lists threads and the fixed pages", async () => {
    const { app } = buildTestApp({ seed: seed(), production: true });

    expect((await request(app).get("/sitemaps/threads.xml")).text).toContain(
      "https://playrates.app/community/thread/7",
    );
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
