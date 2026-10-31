import type { Request, Response } from "express";

/* Short, as the version it points at moves whenever the picture does. */
const REDIRECT_CACHE = "public, max-age=60, s-maxage=60";

/**
 * Sends a request for a drawn picture on to the version it should ask for,
 * when it named another. Each `v` is its own CDN cache entry, so without
 * this any made-up value would draw the picture afresh: a render and a
 * round of cover fetches per request, on demand.
 *
 * True when it redirected and the route has nothing more to do.
 */
export const redirectToVersion = (
  req: Request,
  res: Response,
  current: string,
): boolean => {
  const asked = req.query.v;
  if (asked === undefined || asked === current) return false;
  const url = new URL(req.originalUrl, "http://local");
  url.searchParams.set("v", current);
  res
    .setHeader("Cache-Control", REDIRECT_CACHE)
    .redirect(302, `${url.pathname}${url.search}`);
  return true;
};
