import { SITE_ORIGIN } from "@playrates/shared";
import type { SitemapEntry } from "./sitemap.repository.js";

/** Well under the protocol's 50,000, so a page stays a quick read. */
export const GAMES_PER_SITEMAP = 40_000;

/** The pages that are always there. */
export const STATIC_PATHS = [
  "/",
  "/library",
  "/community",
  "/contact",
  "/privacy",
  "/terms",
];

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const XML = '<?xml version="1.0" encoding="UTF-8"?>';
const NS = 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';

export interface UrlEntry {
  path: string;
  lastmod?: string;
}

export const urlSet = (entries: UrlEntry[]): string =>
  [
    XML,
    `<urlset ${NS}>`,
    ...entries.map(
      ({ path, lastmod }) =>
        `<url><loc>${escapeXml(SITE_ORIGIN + path)}</loc>${
          lastmod ? `<lastmod>${escapeXml(lastmod)}</lastmod>` : ""
        }</url>`,
    ),
    "</urlset>",
  ].join("\n");

/** The index: one entry per sitemap page, so crawlers fetch them in turn. */
export const sitemapIndex = (paths: string[]): string =>
  [
    XML,
    `<sitemapindex ${NS}>`,
    ...paths.map(
      (path) =>
        `<sitemap><loc>${escapeXml(SITE_ORIGIN + path)}</loc></sitemap>`,
    ),
    "</sitemapindex>",
  ].join("\n");

export const gamePages = (gameCount: number): string[] =>
  Array.from(
    { length: Math.ceil(gameCount / GAMES_PER_SITEMAP) },
    (_, i) => `/sitemaps/games-${i + 1}.xml`,
  );

export const gameEntries = (games: SitemapEntry[]): UrlEntry[] =>
  games.map(({ id, lastmod }) => ({ path: `/game/${id}`, lastmod }));

export const threadEntries = (threads: SitemapEntry[]): UrlEntry[] =>
  threads.map(({ id, lastmod }) => ({
    path: `/community/thread/${id}`,
    lastmod,
  }));

/** Somewhere that isn't the live site (a preview deployment, a laptop)
 *  asks for nothing to be crawled at all. */
/** Out of bounds for every crawler. */
const DISALLOW = ["/admin", "/settings", "/community/new", "/api/"];

/**
 * AI crawlers, named so a later change to the wildcard can't shut them out by
 * accident. The search and answer engines fetch a page to cite it; the
 * training crawlers read the site for their models. Both are welcome.
 */
export const AI_CRAWLERS = [
  // search and answers
  "OAI-SearchBot",
  "ChatGPT-User",
  "PerplexityBot",
  "Perplexity-User",
  "Claude-SearchBot",
  "Claude-User",
  // training
  "GPTBot",
  "ClaudeBot",
  "CCBot",
  "Google-Extended",
  "Applebot-Extended",
];

/* A crawler follows the group naming it and ignores "*", so the named group
   repeats the same rules rather than inheriting them. */
const group = (agents: string[]) => [
  ...agents.map((agent) => `User-agent: ${agent}`),
  ...DISALLOW.map((path) => `Disallow: ${path}`),
];

export const robotsTxt = (production: boolean): string =>
  production
    ? [
        ...group(["*"]),
        "",
        ...group(AI_CRAWLERS),
        "",
        `Sitemap: ${SITE_ORIGIN}/sitemap.xml`,
        "",
      ].join("\n")
    : ["User-agent: *", "Disallow: /", ""].join("\n");
