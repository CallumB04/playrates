import { Router, type RequestHandler } from "express";
import {
  AdminEventIdParamSchema,
  AdminReorderSchema,
  AdminRevealIdParamSchema,
  AdminRevealInputSchema,
  EventSlugParamSchema,
  RevealParamSchema,
  type AdminRevealInput,
} from "@playrates/shared";
import type { z } from "zod";
import { AppError } from "../../../lib/AppError.js";
import { perMinute } from "../../../lib/rateLimit.js";
import { validate } from "../../../middleware/validate.js";
import type { EventsService } from "../events.service.js";
import type { ShowcaseService } from "./showcase.service.js";

const callerId = (req: Parameters<RequestHandler>[0]): string => {
  const id = req.auth?.userId;
  if (!id) throw AppError.unauthorized();
  return id;
};

type RevealParams = z.infer<typeof RevealParamSchema>;

/** Mounted at /me/events: your own hype at a showcase. */
export const createMyShowcaseRouter = ({
  showcase,
  requireAuth,
}: {
  showcase: ShowcaseService;
  requireAuth: RequestHandler;
}): Router => {
  const router = Router();
  const hyping = perMinute("showcase-hype", 30);

  router.get(
    "/:slug/hype",
    requireAuth,
    validate({ params: EventSlugParamSchema }),
    async (req, res) => {
      const { slug } = req.valid!.params as z.infer<
        typeof EventSlugParamSchema
      >;
      res.json(await showcase.hypeOf(callerId(req), slug));
    },
  );

  router.put(
    "/:slug/hype/:revealId",
    requireAuth,
    hyping,
    validate({ params: RevealParamSchema }),
    async (req, res) => {
      const { slug, revealId } = req.valid!.params as RevealParams;
      res.json(await showcase.setHype(callerId(req), slug, revealId, true));
    },
  );

  router.delete(
    "/:slug/hype/:revealId",
    requireAuth,
    hyping,
    validate({ params: RevealParamSchema }),
    async (req, res) => {
      const { slug, revealId } = req.valid!.params as RevealParams;
      res.json(await showcase.setHype(callerId(req), slug, revealId, false));
    },
  );

  return router;
};

/** Mounted at /admin/events beside the events' own routes. Every change
 *  answers with the whole event, read back through the events service. */
export const createAdminShowcaseRouter = ({
  showcase,
  events,
}: {
  showcase: ShowcaseService;
  events: EventsService;
}): Router => {
  const router = Router();
  const whole = async (eventId: Promise<number>) =>
    events.adminGet(await eventId);

  router.post(
    "/:eventId/reveals",
    validate({ params: AdminEventIdParamSchema, body: AdminRevealInputSchema }),
    async (req, res) => {
      const { eventId } = req.valid!.params as z.infer<
        typeof AdminEventIdParamSchema
      >;
      res
        .status(201)
        .json(
          await whole(
            showcase.addReveal(eventId, req.valid!.body as AdminRevealInput),
          ),
        );
    },
  );

  router.put(
    "/:eventId/reveals/order",
    validate({ params: AdminEventIdParamSchema, body: AdminReorderSchema }),
    async (req, res) => {
      const { eventId } = req.valid!.params as z.infer<
        typeof AdminEventIdParamSchema
      >;
      const { ids } = req.valid!.body as z.infer<typeof AdminReorderSchema>;
      res.json(await whole(showcase.reorderReveals(eventId, ids)));
    },
  );

  router.delete(
    "/reveals/:revealId",
    validate({ params: AdminRevealIdParamSchema }),
    async (req, res) => {
      const { revealId } = req.valid!.params as z.infer<
        typeof AdminRevealIdParamSchema
      >;
      res.json(await whole(showcase.deleteReveal(revealId)));
    },
  );

  return router;
};
