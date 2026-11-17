import { Router } from "express";
import {
  AdminEventIdParamSchema,
  AdminEventInputSchema,
  AdminEventPublishSchema,
  EventSlugParamSchema,
  GameIdParamSchema,
  type AdminEventInput,
} from "@playrates/shared";
import type { z } from "zod";
import { validate } from "../../middleware/validate.js";
import type { EventsService } from "./events.service.js";

type EventParams = z.infer<typeof AdminEventIdParamSchema>;

/** Mounted at /events. The same for every visitor, so the CDN may keep it. */
export const createEventsRouter = ({
  service,
}: {
  service: EventsService;
}): Router => {
  const router = Router();

  router.get("/", async (_req, res) => {
    res.json(await service.list());
  });

  router.get("/current", async (_req, res) => {
    res.json(await service.current());
  });

  router.get(
    "/:slug",
    validate({ params: EventSlugParamSchema }),
    async (req, res) => {
      const { slug } = req.valid!.params as z.infer<
        typeof EventSlugParamSchema
      >;
      res.json(await service.bySlug(slug));
    },
  );

  return router;
};

/** Mounted at /games/:gameId/events: where a game has turned up. */
export const createGameEventsRouter = ({
  service,
}: {
  service: EventsService;
}): Router => {
  const router = Router({ mergeParams: true });

  router.get("/", validate({ params: GameIdParamSchema }), async (req, res) => {
    const { gameId } = req.valid!.params as { gameId: number };
    res.json(await service.forGame(gameId));
  });

  return router;
};

/** Mounted at /admin/events, behind the admin gate: the frame every event
 *  shares. Each kind's own editing sits beside it. */
export const createAdminEventsRouter = ({
  service,
}: {
  service: EventsService;
}): Router => {
  const router = Router();

  router.get("/", async (_req, res) => {
    res.json(await service.adminList());
  });

  router.post(
    "/",
    validate({ body: AdminEventInputSchema }),
    async (req, res) => {
      res
        .status(201)
        .json(await service.create(req.valid!.body as AdminEventInput));
    },
  );

  router.get(
    "/:eventId",
    validate({ params: AdminEventIdParamSchema }),
    async (req, res) => {
      const { eventId } = req.valid!.params as EventParams;
      res.json(await service.adminGet(eventId));
    },
  );

  router.put(
    "/:eventId",
    validate({ params: AdminEventIdParamSchema, body: AdminEventInputSchema }),
    async (req, res) => {
      const { eventId } = req.valid!.params as EventParams;
      res.json(
        await service.update(eventId, req.valid!.body as AdminEventInput),
      );
    },
  );

  router.put(
    "/:eventId/published",
    validate({
      params: AdminEventIdParamSchema,
      body: AdminEventPublishSchema,
    }),
    async (req, res) => {
      const { eventId } = req.valid!.params as EventParams;
      const { published } = req.valid!.body as { published: boolean };
      res.json(await service.setPublished(eventId, published));
    },
  );

  return router;
};
