import express, { Router, type RequestHandler } from "express";
import {
  AVATAR_MAX_BYTES,
  UPLOAD_IMAGE_MIMES,
  AdminCategoryIdParamSchema,
  AdminCategoryInputSchema,
  AdminEventIdParamSchema,
  AdminNomineeIdParamSchema,
  AdminNomineeInputSchema,
  AdminReorderSchema,
  AdminWinnerSchema,
  AwardCategoryParamSchema,
  AwardPickInputSchema,
  EventSlugParamSchema,
  type AdminCategoryInput,
  type AdminNomineeInput,
  type AwardPickInput,
} from "@playrates/shared";
import type { z } from "zod";
import { AppError } from "../../../lib/AppError.js";
import { perMinute } from "../../../lib/rateLimit.js";
import { validate } from "../../../middleware/validate.js";
import type { EventsService } from "../events.service.js";
import type { AwardsService } from "./awards.service.js";

const callerId = (req: Parameters<RequestHandler>[0]): string => {
  const id = req.auth?.userId;
  if (!id) throw AppError.unauthorized();
  return id;
};

type SlugParams = z.infer<typeof EventSlugParamSchema>;
type CategoryParams = z.infer<typeof AwardCategoryParamSchema>;

/** Mounted at /events: an awards night's leaderboard, which names you
 *  to yourself and those you may see to you. */
export const createAwardsBoardRouter = ({
  awards,
  optionalAuth,
}: {
  awards: AwardsService;
  optionalAuth: RequestHandler;
}): Router => {
  const router = Router();
  const limiter = perMinute("award-board", 60);

  router.get(
    "/:slug/leaderboard",
    limiter,
    optionalAuth,
    validate({ params: EventSlugParamSchema }),
    async (req, res) => {
      const { slug } = req.valid!.params as SlugParams;
      res.json(await awards.leaderboard(slug, req.auth?.userId));
    },
  );

  return router;
};

/** Mounted at /me/events: your own picks at an awards night. */
export const createMyAwardsRouter = ({
  awards,
  requireAuth,
}: {
  awards: AwardsService;
  requireAuth: RequestHandler;
}): Router => {
  const router = Router();
  const picking = perMinute("award-picks", 30);

  router.get(
    "/:slug/picks",
    requireAuth,
    validate({ params: EventSlugParamSchema }),
    async (req, res) => {
      const { slug } = req.valid!.params as SlugParams;
      res.json(await awards.picksOf(callerId(req), slug));
    },
  );

  router.put(
    "/:slug/picks/:categoryId",
    requireAuth,
    picking,
    validate({ params: AwardCategoryParamSchema, body: AwardPickInputSchema }),
    async (req, res) => {
      const { slug, categoryId } = req.valid!.params as CategoryParams;
      const { nomineeId } = req.valid!.body as AwardPickInput;
      res.json(await awards.pick(callerId(req), slug, categoryId, nomineeId));
    },
  );

  router.delete(
    "/:slug/picks/:categoryId",
    requireAuth,
    picking,
    validate({ params: AwardCategoryParamSchema }),
    async (req, res) => {
      const { slug, categoryId } = req.valid!.params as CategoryParams;
      res.json(await awards.pick(callerId(req), slug, categoryId, null));
    },
  );

  return router;
};

/* A picture comes as raw bytes, already compressed by the browser, as a
   profile picture does; the limit is the service's own. */
const imageBody = express.raw({
  type: [...UPLOAD_IMAGE_MIMES],
  limit: AVATAR_MAX_BYTES,
});

/** Mounted at /admin/events beside the events' own routes. Every change
 *  answers with the whole event, read back through the events service. */
export const createAdminAwardsRouter = ({
  awards,
  events,
}: {
  awards: AwardsService;
  events: EventsService;
}): Router => {
  const router = Router();
  const whole = async (eventId: Promise<number>) =>
    events.adminGet(await eventId);
  const imageLimiter = perMinute("nominee-images", 30);

  type EventParams = z.infer<typeof AdminEventIdParamSchema>;
  type CategoryIdParams = z.infer<typeof AdminCategoryIdParamSchema>;
  type NomineeParams = z.infer<typeof AdminNomineeIdParamSchema>;
  type Reorder = z.infer<typeof AdminReorderSchema>;

  router.post(
    "/:eventId/categories",
    validate({
      params: AdminEventIdParamSchema,
      body: AdminCategoryInputSchema,
    }),
    async (req, res) => {
      const { eventId } = req.valid!.params as EventParams;
      res
        .status(201)
        .json(
          await whole(
            awards.addCategory(eventId, req.valid!.body as AdminCategoryInput),
          ),
        );
    },
  );

  router.put(
    "/:eventId/categories/order",
    validate({ params: AdminEventIdParamSchema, body: AdminReorderSchema }),
    async (req, res) => {
      const { eventId } = req.valid!.params as EventParams;
      const { ids } = req.valid!.body as Reorder;
      res.json(await whole(awards.reorderCategories(eventId, ids)));
    },
  );

  router.put(
    "/categories/:categoryId",
    validate({
      params: AdminCategoryIdParamSchema,
      body: AdminCategoryInputSchema,
    }),
    async (req, res) => {
      const { categoryId } = req.valid!.params as CategoryIdParams;
      res.json(
        await whole(
          awards.updateCategory(
            categoryId,
            req.valid!.body as AdminCategoryInput,
          ),
        ),
      );
    },
  );

  router.delete(
    "/categories/:categoryId",
    validate({ params: AdminCategoryIdParamSchema }),
    async (req, res) => {
      const { categoryId } = req.valid!.params as CategoryIdParams;
      res.json(await whole(awards.deleteCategory(categoryId)));
    },
  );

  router.post(
    "/categories/:categoryId/nominees",
    validate({
      params: AdminCategoryIdParamSchema,
      body: AdminNomineeInputSchema,
    }),
    async (req, res) => {
      const { categoryId } = req.valid!.params as CategoryIdParams;
      res
        .status(201)
        .json(
          await whole(
            awards.addNominee(categoryId, req.valid!.body as AdminNomineeInput),
          ),
        );
    },
  );

  router.post(
    "/nominees/:nomineeId/image",
    imageLimiter,
    imageBody,
    validate({ params: AdminNomineeIdParamSchema }),
    async (req, res) => {
      const { nomineeId } = req.valid!.params as NomineeParams;
      // express.raw leaves an empty object where the type did not match.
      const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
      res.json(await whole(awards.setNomineeImage(nomineeId, body)));
    },
  );

  router.delete(
    "/nominees/:nomineeId/image",
    validate({ params: AdminNomineeIdParamSchema }),
    async (req, res) => {
      const { nomineeId } = req.valid!.params as NomineeParams;
      res.json(await whole(awards.clearNomineeImage(nomineeId)));
    },
  );

  router.put(
    "/categories/:categoryId/nominees/order",
    validate({ params: AdminCategoryIdParamSchema, body: AdminReorderSchema }),
    async (req, res) => {
      const { categoryId } = req.valid!.params as CategoryIdParams;
      const { ids } = req.valid!.body as Reorder;
      res.json(await whole(awards.reorderNominees(categoryId, ids)));
    },
  );

  router.delete(
    "/nominees/:nomineeId",
    validate({ params: AdminNomineeIdParamSchema }),
    async (req, res) => {
      const { nomineeId } = req.valid!.params as NomineeParams;
      res.json(await whole(awards.deleteNominee(nomineeId)));
    },
  );

  router.put(
    "/nominees/:nomineeId/won",
    validate({ params: AdminNomineeIdParamSchema, body: AdminWinnerSchema }),
    async (req, res) => {
      const { nomineeId } = req.valid!.params as NomineeParams;
      const { won } = req.valid!.body as { won: boolean };
      res.json(await whole(awards.setWinner(nomineeId, won)));
    },
  );

  return router;
};
