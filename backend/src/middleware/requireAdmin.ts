import type { RequestHandler } from "express";
import { AppError } from "../lib/AppError.js";
import type { ProfilesRepository } from "../modules/profiles/profiles.repository.js";

/**
 * Mounted once, in front of the whole admin router, so no admin route can be
 * added without it. Runs after requireAuth.
 *
 * Not found rather than forbidden, like the admin pages: to anyone else the
 * admin API should look like it isn't there.
 */
export const requireAdmin =
  (profiles: Pick<ProfilesRepository, "findById">): RequestHandler =>
  async (req, _res, next) => {
    const userId = req.auth?.userId;
    if (!userId) throw AppError.unauthorized();

    const profile = await profiles.findById(userId);
    if (!profile?.is_admin) throw AppError.notFound("Endpoint");

    next();
  };
