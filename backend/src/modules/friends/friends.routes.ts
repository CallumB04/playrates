import { Router, type RequestHandler } from "express";
import {
  FriendQuerySchema,
  FriendRequestSchema,
  UserIdSchema,
  UsernameParamSchema,
} from "@playrates/shared";
import type { z } from "zod";
import { validate } from "../../middleware/validate.js";
import { AppError } from "../../lib/AppError.js";
import type { FriendsService } from "./friends.service.js";

interface Deps {
  service: FriendsService;
  requireAuth: RequestHandler;
  optionalAuth: RequestHandler;
}

const callerId = (req: Parameters<RequestHandler>[0]): string => {
  const id = req.auth?.userId;
  if (!id) throw AppError.unauthorized();
  return id;
};

/** Mounted at /me/friends. */
export const createMyFriendsRouter = ({
  service,
  requireAuth,
}: Deps): Router => {
  const router = Router();
  router.use(requireAuth);

  router.get("/", validate({ query: FriendQuerySchema }), async (req, res) => {
    const { status } = req.valid!.query as z.infer<typeof FriendQuerySchema>;
    res.json({ data: await service.listForUser(callerId(req), status) });
  });

  router.post(
    "/requests",
    validate({ body: FriendRequestSchema }),
    async (req, res) => {
      const { userId } = req.valid!.body as z.infer<typeof FriendRequestSchema>;
      res.status(201).json(await service.sendRequest(callerId(req), userId));
    },
  );

  router.post(
    "/:userId/accept",
    validate({ params: UserIdSchema }),
    async (req, res) => {
      const { userId } = req.valid!.params as { userId: string };
      res.json(await service.acceptRequest(callerId(req), userId));
    },
  );

  // decline, cancel and remove were three copies of the same logic
  router.delete(
    "/:userId",
    validate({ params: UserIdSchema }),
    async (req, res) => {
      const { userId } = req.valid!.params as { userId: string };
      await service.removeRelationship(callerId(req), userId);
      res.status(204).end();
    },
  );

  return router;
};

/** Mounted at /users/:username/friends. */
export const createUserFriendsRouter = ({
  service,
  optionalAuth,
}: Deps): Router => {
  const router = Router({ mergeParams: true });

  router.get(
    "/",
    optionalAuth,
    validate({ params: UsernameParamSchema, query: FriendQuerySchema }),
    async (req, res) => {
      const { username } = req.valid!.params as { username: string };
      const { status } = req.valid!.query as z.infer<typeof FriendQuerySchema>;
      res.json({ data: await service.listForUsername(username, status) });
    },
  );

  return router;
};
