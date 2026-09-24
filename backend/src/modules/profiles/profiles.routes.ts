import { Router, type RequestHandler } from "express";
import rateLimit from "express-rate-limit";
import {
  CheckUsernameSchema,
  PaginationSchema,
  UpdateProfileSchema,
  UsernameParamSchema,
} from "@playrates/shared";
import { z } from "zod";
import { validate } from "../../middleware/validate.js";
import { AppError } from "../../lib/AppError.js";
import type { ProfilesService } from "./profiles.service.js";

interface Deps {
  service: ProfilesService;
  requireAuth: RequestHandler;
}

/** Every authenticated route has req.auth set by the time it runs. */
const callerId = (req: Parameters<RequestHandler>[0]): string => {
  const id = req.auth?.userId;
  if (!id) throw AppError.unauthorized();
  return id;
};

/** No upstream cost behind this one, but it is the only unauthenticated route
 *  that reads a list of people — so it gets a ceiling of its own. */
const profileSearchLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

export const createProfilesRouter = ({
  service,
  requireAuth,
}: Deps): Router => {
  const router = Router();

  // "/me" and "/check-username" must come before "/:username", or they parse
  // as usernames.

  router.get("/me", requireAuth, async (req, res) => {
    res.json(await service.getById(callerId(req)));
  });

  router.patch(
    "/me",
    requireAuth,
    validate({ body: UpdateProfileSchema }),
    async (req, res) => {
      const input = req.valid!.body as z.infer<typeof UpdateProfileSchema>;
      res.json(await service.updateOwn(callerId(req), input));
    },
  );

  router.delete("/me", requireAuth, async (req, res) => {
    await service.deleteOwn(callerId(req));
    res.status(204).end();
  });

  router.post("/me/heartbeat", requireAuth, async (req, res) => {
    await service.heartbeat(callerId(req));
    res.status(204).end();
  });

  router.get(
    "/check-username",
    validate({ query: CheckUsernameSchema }),
    async (req, res) => {
      const { username } = req.valid!.query as z.infer<
        typeof CheckUsernameSchema
      >;
      res.json({ available: await service.isUsernameAvailable(username) });
    },
  );

  /* Open to anyone: a profile page is already public, so requiring a session
     to find one only meant the masthead could not offer people to a signed-out
     visitor. The term is required and rate limited, so this looks names up
     rather than handing out the whole directory. */
  router.get(
    "/",
    profileSearchLimiter,
    validate({
      query: PaginationSchema.extend({
        search: z.string().trim().min(2).max(200),
      }),
    }),
    async (req, res) => {
      const { search, ...pagination } = req.valid!.query as {
        search: string;
        page: number;
        limit: number;
      };
      res.json(await service.search(search, pagination));
    },
  );

  router.get(
    "/:username",
    validate({ params: UsernameParamSchema }),
    async (req, res) => {
      const { username } = req.valid!.params as { username: string };
      res.json(await service.getByUsername(username));
    },
  );

  return router;
};
