import { Router, type RequestHandler } from "express";
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
