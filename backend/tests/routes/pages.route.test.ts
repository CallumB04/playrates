import { describe, expect, it } from "vitest";
import request from "supertest";
import { buildTestApp, USER_A } from "../helpers/buildTestApp.js";
import {
  baseSeed,
  buildGame,
  buildMessage,
  buildProfile,
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
    expect(response.text).toContain('<div id="root"></div>');
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
    expect(response.text).not.toContain("example.test/cover.jpg\" />");
  });

  it("404s a game that isn't there, and asks not to be indexed", async () => {
    const { app } = buildTestApp({ seed: baseSeed() });

    for (const path of ["/game/999", "/game/abc"]) {
      const response = await request(app).get(path);
      expect(response.status, path).toBe(404);
      expect(response.text).toContain("<title>Page not found / PlayRates</title>");
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
