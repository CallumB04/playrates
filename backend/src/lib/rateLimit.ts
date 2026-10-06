import rateLimit from "express-rate-limit";

/** A ceiling per client per minute. Build one per app rather than per
 *  module, so each app built (every test builds its own) counts afresh. */
export const perMinute = (limit: number) =>
  rateLimit({
    windowMs: 60_000,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  });
