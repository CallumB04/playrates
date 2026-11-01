import type { RequestHandler } from "express";

const MINUTE = "public, max-age=0, s-maxage=60, stale-while-revalidate=600";
const DAY =
  "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400";

/* Reads that say the same to every visitor who isn't signed in. Profiles
   and anything under /users are left out on purpose: a profile turned
   private has to stop showing at once, not when the cache gets round to
   it. */
const RULES: [RegExp, string][] = [
  [/^\/(genres|platforms)(\/|$)/, DAY],
  [
    /^\/(games|stats|reviews|lists|community\/(threads|trending|patch-notes)|gaming-25\/most-loved)(\/|$)/,
    MINUTE,
  ],
];

/**
 * Lets the CDN answer the public reads a signed-out visitor makes, rather
 * than every one reaching the function and the database. Only for requests
 * with no token: a signed-in answer can differ by who is asking. A route
 * that sets its own Cache-Control later (the drawn pictures) wins, and an
 * error is never cached (the error handler says no-store).
 */
export const publicCache: RequestHandler = (req, res, next) => {
  if (
    (req.method === "GET" || req.method === "HEAD") &&
    !req.headers.authorization
  ) {
    const rule = RULES.find(([pattern]) => pattern.test(req.path));
    if (rule) res.setHeader("Cache-Control", rule[1]);
  }
  next();
};
