import { SITE_ORIGIN } from "@playrates/shared";
import type { SitemapEntry } from "./sitemap.repository.js";

/** Well under the protocol's 50,000, so a page stays a quick read. */
export const GAMES_PER_SITEMAP = 40_000;

/** The pages that are always there. */
export const STATIC_PATHS = [
  "/",
  "/library",
  "/community",
  "/about",
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
      (path) => `<sitemap><loc>${escapeXml(SITE_ORIGIN + path)}</loc></sitemap>`,
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
export const robotsTxt = (production: boolean): string =>
  production
    ? [
        "User-agent: *",
        "Disallow: /admin",
        "Disallow: /settings",
        "Disallow: /community/new",
        "Disallow: /api/",
        "",
        `Sitemap: ${SITE_ORIGIN}/sitemap.xml`,
        "",
      ].join("\n")
    : ["User-agent: *", "Disallow: /", ""].join("\n");
