import { describe, expect, it } from "vitest";
import {
  gameDescription,
  gamePageName,
  profileDescription,
  truncateDescription,
} from "@playrates/shared";
import {
  buildHead,
  escapeHtml,
  injectHead,
  jsonForScript,
} from "../../src/modules/pages/head.js";
import {
  gamePages,
  robotsTxt,
  sitemapIndex,
  urlSet,
} from "../../src/modules/pages/sitemap.js";

const base = {
  title: "Hades (2020) / PlayRates",
  description: "Hades (2020) on PC.",
  path: "/game/1",
  image: "https://media.example/hades.jpg",
  card: "summary_large_image" as const,
};

describe("the page head", () => {
  it("escapes everything a user could have written", () => {
    const head = buildHead({
      ...base,
      title: '</title><script>alert("x")</script>',
      description: `"><img src=x onerror=alert(1)>`,
    });

    expect(head).not.toContain("<script>alert");
    expect(head).not.toContain("<img");
    expect(head).toContain("&lt;/title&gt;&lt;script&gt;");
    expect(head).toContain("&quot;&gt;&lt;img");
  });

  it("keeps JSON-LD from closing its own script tag", () => {
    const json = jsonForScript({ name: "</script><script>alert(1)</script>" });

    expect(json).not.toContain("</script>");
    expect(JSON.parse(json)).toEqual({
      name: "</script><script>alert(1)</script>",
    });
  });

  it("names the page canonically on the live origin", () => {
    const head = buildHead(base);

    expect(head).toContain(
      '<link rel="canonical" href="https://playrates.app/game/1" />',
    );
    expect(head).toContain('property="og:url" content="https://playrates.app/game/1"');
    expect(head).toContain('name="twitter:card" content="summary_large_image"');
    expect(head).not.toContain("robots");
  });

  it("asks not to be indexed when told to", () => {
    expect(buildHead({ ...base, noindex: true })).toContain(
      '<meta name="robots" content="noindex" />',
    );
  });

  it("replaces only what sits between the markers", () => {
    const template =
      "<head><meta charset=utf-8><!-- head:start --><title>old</title><!-- head:end --><link rel=icon></head>";

    const html = injectHead(template, "<title>new</title>");

    expect(html).toContain("<meta charset=utf-8>");
    expect(html).toContain("<link rel=icon>");
    expect(html).toContain("<title>new</title>");
    expect(html).not.toContain("<title>old</title>");
  });

  it("leaves a template without markers as it was", () => {
    expect(injectHead("<head></head>", "<title>x</title>")).toBe(
      "<head></head>",
    );
  });

  it("escapes the five characters HTML cares about", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
  });
});

describe("page descriptions", () => {
  const hades = {
    title: "Hades",
    releaseDate: "2020-09-17",
    platforms: ["PC", "PlayStation", "Xbox", "Nintendo Switch", "iOS"],
    avgRating: 9.25,
    ratingCount: 12,
  };

  it("names a game with its year", () => {
    expect(gamePageName(hades)).toBe("Hades (2020)");
    expect(gamePageName({ ...hades, releaseDate: null })).toBe("Hades");
  });

  it("gives the platforms and the PlayRates rating", () => {
    expect(gameDescription(hades)).toBe(
      "Hades (2020) on PC, PlayStation, Xbox and Nintendo Switch. Rated 9.3/10 from 12 ratings on PlayRates.",
    );
  });

  it("invites a log when nobody has rated it", () => {
    expect(
      gameDescription({
        ...hades,
        platforms: ["PC"],
        avgRating: null,
        ratingCount: 0,
      }),
    ).toBe("Hades (2020) on PC. Log, rate and review it on PlayRates.");
  });

  it("says rating, not ratings, for one", () => {
    expect(gameDescription({ ...hades, ratingCount: 1 })).toContain(
      "from 1 rating on",
    );
  });

  it("uses a bio when there is one, and says whose games otherwise", () => {
    expect(profileDescription("bee", "Mostly roguelikes.")).toBe(
      "Mostly roguelikes.",
    );
    expect(profileDescription("bee", "  ")).toBe("bee’s games on PlayRates.");
  });

  it("cuts long text at a word and folds its whitespace", () => {
    const cut = truncateDescription(`${"lorem ipsum ".repeat(30)}\n\nend`);

    expect(cut.length).toBeLessThanOrEqual(155);
    expect(cut).toMatch(/\w…$/);
    expect(cut).not.toContain("\n");
  });

  it("leaves short text alone", () => {
    expect(truncateDescription("Short.")).toBe("Short.");
  });
});

describe("sitemaps", () => {
  it("splits the catalogue into pages of forty thousand", () => {
    expect(gamePages(0)).toEqual([]);
    expect(gamePages(40_000)).toEqual(["/sitemaps/games-1.xml"]);
    expect(gamePages(130_272)).toHaveLength(4);
  });

  it("lists absolute URLs with their dates", () => {
    const xml = urlSet([{ path: "/game/1", lastmod: "2026-09-27" }]);

    expect(xml).toContain(
      "<url><loc>https://playrates.app/game/1</loc><lastmod>2026-09-27</lastmod></url>",
    );
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
  });

  it("indexes its pages", () => {
    expect(sitemapIndex(["/sitemaps/pages.xml"])).toContain(
      "<sitemap><loc>https://playrates.app/sitemaps/pages.xml</loc></sitemap>",
    );
  });

  it("opens the live site to crawlers and closes every other copy", () => {
    expect(robotsTxt(true)).toContain(
      "Sitemap: https://playrates.app/sitemap.xml",
    );
    expect(robotsTxt(true)).toContain("Disallow: /admin");
    expect(robotsTxt(false)).toBe("User-agent: *\nDisallow: /\n");
  });
});
