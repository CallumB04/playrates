import { Router, type RequestHandler } from "express";
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

export const createProfilesRouter = ({
  service,
  requireAuth,
}: Deps): Router => {
  const router = Router();

  // NOTE: the literal "/me" and "/check-username" routes must be declared
  // before "/:username", or they would be captured as usernames.

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

  router.get(
    "/",
    requireAuth,
    validate({
      query: PaginationSchema.extend({
        search: z.string().trim().max(200).optional(),
      }),
    }),
    async (req, res) => {
      const { search, ...pagination } = req.valid!.query as {
        search?: string;
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
