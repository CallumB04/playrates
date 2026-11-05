import { Router, type RequestHandler } from "express";
import {
  NotificationIdSchema,
  NotificationPatchSchema,
  NotificationQuerySchema,
  NotificationReadAllSchema,
  NotificationBulkPatchSchema,
  type NotificationBulkPatch,
  type NotificationReadAll,
} from "@playrates/shared";
import type { z } from "zod";
import { validate } from "../../middleware/validate.js";
import { AppError } from "../../lib/AppError.js";
import type { NotificationsService } from "./notifications.service.js";

interface Deps {
  service: NotificationsService;
  requireAuth: RequestHandler;
}

const callerId = (req: Parameters<RequestHandler>[0]): string => {
  const id = req.auth?.userId;
  if (!id) throw AppError.unauthorized();
  return id;
};

/** Mounted at /me/notifications. There is no route to anyone else's. */
export const createMyNotificationsRouter = ({
  service,
  requireAuth,
}: Deps): Router => {
  const router = Router();
  router.use(requireAuth);

  router.get(
    "/",
    validate({ query: NotificationQuerySchema }),
    async (req, res) => {
      const query = req.valid!.query as z.infer<
        typeof NotificationQuerySchema
      >;
      res.json(await service.listForUser(callerId(req), query));
    },
  );

  // Before "/:id", or the literal is read as an id and fails validation.
  // A body is optional: without one, everything is read, as before.
  router.post(
    "/read-all",
    validate({ body: NotificationReadAllSchema }),
    async (req, res) => {
      const body = req.valid!.body as NotificationReadAll;
      await service.markAllRead(callerId(req), body?.ids);
      res.status(204).end();
    },
  );

  router.post("/seen", async (req, res) => {
    await service.markSeen(callerId(req));
    res.status(204).end();
  });

  router.post("/archive-all", async (req, res) => {
    await service.archiveAllRead(callerId(req));
    res.status(204).end();
  });

  router.patch(
    "/",
    validate({ body: NotificationBulkPatchSchema }),
    async (req, res) => {
      await service.patchMany(
        callerId(req),
        req.valid!.body as NotificationBulkPatch,
      );
      res.status(204).end();
    },
  );

  router.patch(
    "/:id",
    validate({ params: NotificationIdSchema, body: NotificationPatchSchema }),
    async (req, res) => {
      const { id } = req.valid!.params as { id: number };
      const patch = req.valid!.body as z.infer<typeof NotificationPatchSchema>;
      res.json(await service.patch(id, callerId(req), patch));
    },
  );

  return router;
};
