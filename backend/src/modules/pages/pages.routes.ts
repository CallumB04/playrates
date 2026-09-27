import { Router, type Request, type Response } from "express";
import { pageTitle, SITE_DESCRIPTION } from "@playrates/shared";
import { SITE_HEADERS } from "../../config/siteHeaders.js";
import type { Logger } from "../../lib/logger.js";
import { buildHead, DEFAULT_IMAGE, injectHead, type HeadMeta } from "./head.js";
import type { PagesService } from "./pages.service.js";
import type { SitemapRepository } from "./sitemap.repository.js";
import {
  gameEntries,
  gamePages,
  GAMES_PER_SITEMAP,
  robotsTxt,
  sitemapIndex,
  STATIC_PATHS,
  threadEntries,
  urlSet,
} from "./sitemap.js";
import type { TemplateSource } from "./template.js";

interface Deps {
  service: PagesService;
  sitemap: SitemapRepository;
  template: TemplateSource;
  logger: Logger;
  /** Only the live site asks to be indexed. */
  production: boolean;
}

// Long enough to spare the database a crawler's attention; short enough
// that an edit shows in a preview the same day.
const PAGE_CACHE = "public, max-age=0, s-maxage=300, stale-while-revalidate=86400";
const SITEMAP_CACHE = "public, max-age=3600, s-maxage=86400";

const NOT_FOUND: Omit<HeadMeta, "path"> = {
  title: pageTitle("Page not found"),
  description: SITE_DESCRIPTION,
  image: DEFAULT_IMAGE,
  card: "summary",
  noindex: true,
};

const numericParam = (value: unknown): number | null =>
  typeof value === "string" && /^\d{1,15}$/.test(value) ? Number(value) : null;

/**
 * The pages worth a preview, rendered with their own head: game, profile
 * and thread. Everything else is the static index.html, served as it is.
 *
 * Mounted ahead of helmet, since these are pages rather than API responses
 * and carry the site's CSP instead of the API's.
 */
export const createPagesRouter = ({
  service,
  sitemap,
  template,
  logger,
  production,
}: Deps): Router => {
  const router = Router();

  const siteHeaders = (res: Response) => {
    for (const [name, value] of Object.entries(SITE_HEADERS)) {
      res.setHeader(name, value);
    }
    if (!production) res.setHeader("X-Robots-Tag", "noindex");
  };

  const render =
    (load: (req: Request) => Promise<HeadMeta | null>) =>
    async (req: Request, res: Response) => {
      const html = await template(`${req.protocol}://${req.get("host")}`);
      siteHeaders(res);
      res.type("html");

      let meta: HeadMeta | null | undefined;
      try {
        meta = await load(req);
      } catch (error) {
        /* A preview is not worth a broken page: serve the app as it is
           and let it fetch for itself. */
        logger.warn({ err: error, path: req.path }, "page head failed");
        res.setHeader("Cache-Control", "no-store");
        res.send(html);
        return;
      }

      if (meta === null) {
        res.status(404).setHeader("Cache-Control", "no-store");
        res.send(injectHead(html, buildHead({ ...NOT_FOUND, path: req.path })));
        return;
      }

      res.setHeader("Cache-Control", PAGE_CACHE);
      res.send(injectHead(html, buildHead(meta)));
    };

  router.get(
    "/game/:id",
    render(async (req) => {
      const id = numericParam(req.params.id);
      return id === null ? null : service.game(id);
    }),
  );

  router.get(
    "/user/:username",
    render((req) => service.profile(String(req.params.username))),
  );

  router.get(
    "/community/thread/:id",
    render(async (req) => {
      const id = numericParam(req.params.id);
      return id === null ? null : service.thread(id);
    }),
  );

  const xml = (res: Response, body: string) => {
    res.type("application/xml").setHeader("Cache-Control", SITEMAP_CACHE);
    if (!production) res.setHeader("X-Robots-Tag", "noindex");
    res.send(body);
  };

  router.get("/robots.txt", (_req, res) => {
    res.type("text/plain").setHeader("Cache-Control", SITEMAP_CACHE);
    res.send(robotsTxt(production));
  });

  router.get("/sitemap.xml", async (_req, res) => {
    const games = await sitemap.countGames();
    xml(
      res,
      sitemapIndex([
        "/sitemaps/pages.xml",
        "/sitemaps/threads.xml",
        ...gamePages(games),
      ]),
    );
  });

  router.get("/sitemaps/pages.xml", (_req, res) => {
    xml(res, urlSet(STATIC_PATHS.map((path) => ({ path }))));
  });

  router.get("/sitemaps/threads.xml", async (_req, res) => {
    xml(res, urlSet(threadEntries(await sitemap.threads())));
  });

  router.get("/sitemaps/games-:page.xml", async (req, res) => {
    const page = numericParam(req.params.page);
    if (page === null || page < 1) {
      res.status(404).end();
      return;
    }
    const games = await sitemap.games(
      (page - 1) * GAMES_PER_SITEMAP,
      GAMES_PER_SITEMAP,
    );
    if (games.length === 0) {
      res.status(404).end();
      return;
    }
    xml(res, urlSet(gameEntries(games)));
  });

  return router;
};
