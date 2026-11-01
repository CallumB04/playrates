import { Router, type Request, type Response } from "express";
import {
  FIXED_PAGES,
  isProfileView,
  pageTitle,
  SITE_DESCRIPTION,
} from "@playrates/shared";
import { env } from "../../config/env.js";
import { SITE_HEADERS } from "../../config/siteHeaders.js";
import type { Logger } from "../../lib/logger.js";
import { buildBody, injectBody } from "./body.js";
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
const PAGE_CACHE =
  "public, max-age=0, s-maxage=300, stale-while-revalidate=86400";
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

/* Where to fetch the app's index.html when it isn't on disk. Never from the
   request's Host header: the copy is kept for the instance's lifetime, so a
   forged host would poison every page it serves after. */
const templateOrigin = () =>
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : env().SITE_URL;

/* Paths the API and the platform keep for themselves. */
const NOT_A_PAGE = /^\/(api(\/|$)|health$)/;

/**
 * Every page the app has, each with its own head: games, profiles, lists
 * and threads from their data, the fixed pages from FIXED_PAGES. Anything
 * else is a 404, so a mistyped address isn't a page search engines keep.
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
      const html = await template(templateOrigin());
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
      const page = injectHead(html, buildHead(meta));
      res.send(meta.body ? injectBody(page, buildBody(meta.body)) : page);
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

  // Ahead of /:view, which would take "gaming-25" for a view and 404 it.
  router.get(
    "/user/:username/gaming-25",
    render((req) => service.gaming25(String(req.params.username))),
  );

  // A view of a profile previews as the profile; an unknown one is a 404.
  router.get(
    "/user/:username/:view",
    render(async (req) =>
      isProfileView(String(req.params.view))
        ? service.profile(String(req.params.username))
        : null,
    ),
  );

  router.get(
    "/user/:username/lists/:id",
    render(async (req) => {
      const id = numericParam(req.params.id);
      return id === null ? null : service.list(String(req.params.username), id);
    }),
  );

  router.get(
    "/community/thread/:id",
    render(async (req) => {
      const id = numericParam(req.params.id);
      return id === null ? null : service.thread(id);
    }),
  );

  // The home page's head is the one index.html carries already.
  router.get("/", async (_req, res) => {
    const html = await template(templateOrigin());
    siteHeaders(res);
    res.type("html").setHeader("Cache-Control", PAGE_CACHE).send(html);
  });

  for (const [path, page] of Object.entries(FIXED_PAGES)) {
    router.get(
      path,
      render(async () => ({
        title: pageTitle(page.title),
        description: page.description ?? SITE_DESCRIPTION,
        path,
        image: DEFAULT_IMAGE,
        card: "summary",
        noindex: page.noindex,
      })),
    );
  }

  // The admin's own pages: the app, and nothing to list.
  router.get(
    /^\/admin(\/.*)?$/,
    render(async (req) => ({
      title: pageTitle(null),
      description: SITE_DESCRIPTION,
      path: req.path,
      image: DEFAULT_IMAGE,
      card: "summary",
      noindex: true,
    })),
  );

  // The library's first name. The filters live in the query string.
  router.get("/catalogue", (req, res) => {
    const query = req.originalUrl.slice(req.path.length);
    res.redirect(301, `/library${query}`);
  });

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

  // Last: any other address is no page of ours.
  router.get(/^\/.*/, (req, res, next) => {
    if (NOT_A_PAGE.test(req.path)) return next();
    return render(async () => null)(req, res);
  });

  return router;
};
