import { Router, type RequestHandler } from "express";
import { z as zod } from "zod";
import {
  GameIdParamSchema,
  PaginationSchema,
  ReviewQuerySchema,
  ReviewInputSchema,
  UsernameParamSchema,
} from "@playrates/shared";
import type { z } from "zod";
import { validate } from "../../middleware/validate.js";
import { AppError } from "../../lib/AppError.js";
import type { ReviewsService } from "./reviews.service.js";

/** Route params are strings; the id has to be coerced before it is used. */
const ReviewIdParamSchema = zod.object({
  reviewId: zod.coerce.number().int().positive(),
});

interface Deps {
  service: ReviewsService;
  requireAuth: RequestHandler;
  optionalAuth: RequestHandler;
}

const callerId = (req: Parameters<RequestHandler>[0]): string => {
  const id = req.auth?.userId;
  if (!id) throw AppError.unauthorized();
  return id;
};

/** Mounted at /me/reviews. */
export const createMyReviewsRouter = ({
  service,
  requireAuth,
}: Deps): Router => {
  const router = Router();
  router.use(requireAuth);

  router.get(
    "/:gameId",
    validate({ params: GameIdParamSchema }),
    async (req, res) => {
      const { gameId } = req.valid!.params as { gameId: number };
      res.json(await service.getOwn(callerId(req), gameId));
    },
  );

  router.put(
    "/:gameId",
    validate({ params: GameIdParamSchema, body: ReviewInputSchema }),
    async (req, res) => {
      const { gameId } = req.valid!.params as { gameId: number };
      const input = req.valid!.body as z.infer<typeof ReviewInputSchema>;
      const { review, created } = await service.upsertOwn(
        callerId(req),
        gameId,
        input,
      );
      res.status(created ? 201 : 200).json(review);
    },
  );

  router.delete(
    "/:gameId",
    validate({ params: GameIdParamSchema }),
    async (req, res) => {
      const { gameId } = req.valid!.params as { gameId: number };
      await service.deleteOwn(callerId(req), gameId);
      res.status(204).end();
    },
  );

  return router;
};

/** Mounted at /games/:gameId/reviews. */
export const createGameReviewsRouter = ({
  service,
  optionalAuth,
}: Deps): Router => {
  const router = Router({ mergeParams: true });

  router.get(
    "/",
    optionalAuth,
    validate({ params: GameIdParamSchema, query: ReviewQuerySchema }),
    async (req, res) => {
      const { gameId } = req.valid!.params as { gameId: number };
      const { sort, ...pagination } = req.valid!.query as z.infer<
        typeof ReviewQuerySchema
      >;
      res.json(
        await service.listByGame(gameId, req.auth?.userId, pagination, sort),
      );
    },
  );

  return router;
};

/** Mounted at /reviews. The site-wide feed, and voting. */
export const createReviewsFeedRouter = ({
  service,
  requireAuth,
  optionalAuth,
}: Deps): Router => {
  const router = Router();

  router.get(
    "/",
    optionalAuth,
    validate({ query: PaginationSchema }),
    async (req, res) => {
      const pagination = req.valid!.query as z.infer<typeof PaginationSchema>;
      res.json(await service.listRecent(pagination, req.auth?.userId));
    },
  );

  // A toggle, so the client needs no current state and can't double-count.
  router.post(
    "/:reviewId/vote",
    requireAuth,
    validate({ params: ReviewIdParamSchema }),
    async (req, res) => {
      const { reviewId } = req.valid!.params as { reviewId: number };
      res.json(await service.toggleVote(callerId(req), reviewId));
    },
  );

  return router;
};

/** Mounted at /users/:username/reviews. */
export const createUserReviewsRouter = ({
  service,
  optionalAuth,
}: Deps): Router => {
  const router = Router({ mergeParams: true });

  router.get(
    "/",
    optionalAuth,
    validate({ params: UsernameParamSchema, query: PaginationSchema }),
    async (req, res) => {
      const { username } = req.valid!.params as { username: string };
      const pagination = req.valid!.query as z.infer<typeof PaginationSchema>;
      res.json(
        await service.listByUsername(username, req.auth?.userId, pagination),
      );
    },
  );

  return router;
};
