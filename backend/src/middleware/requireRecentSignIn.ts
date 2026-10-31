import type { RequestHandler } from "express";
import { AppError } from "../lib/AppError.js";

/** How long a sign-in counts as just now. */
export const RECENT_SIGN_IN_MS = 10 * 60_000;

/**
 * For what can't be taken back, or hands over everything: a token alone
 * isn't enough, since one lifted from a device stays good for up to an
 * hour. The person has to have signed in moments ago. Runs after
 * requireAuth.
 */
export const requireRecentSignIn: RequestHandler = (req, _res, next) => {
  const at = req.auth?.signedInAt;
  if (at === undefined || Date.now() - at > RECENT_SIGN_IN_MS) {
    return next(
      new AppError(
        403,
        "reauthentication_required",
        "Sign in again to do this",
      ),
    );
  }
  next();
};
