import { Router, type RequestHandler } from "express";
import {
  GameIdParamSchema,
  GameIdQuerySchema,
  GameLogCreateSchema,
  GameLogInputSchema,
  LogIdParamSchema,
  ReviewInputSchema,
  GameLogPatchSchema,
  GameLogQuerySchema,
  PaginationSchema,
  UsernameParamSchema,
  UserStatsQuerySchema,
} from "@playrates/shared";
import type { z } from "zod";
import { validate } from "../../middleware/validate.js";
import { AppError } from "../../lib/AppError.js";
import type { GameLogsService } from "./gameLogs.service.js";
import type { ReviewsService } from "../reviews/reviews.service.js";

interface Deps {
  service: GameLogsService;
  requireAuth: RequestHandler;
  optionalAuth: RequestHandler;
}

const callerId = (req: Parameters<RequestHandler>[0]): string => {
  const id = req.auth?.userId;
  if (!id) throw AppError.unauthorized();
  return id;
};

const ListQuerySchema = PaginationSchema.merge(GameLogQuerySchema);

/** Mounted at /me/logs. A log per console, so each is addressed by its own
 *  id, and its review hangs off it. */
export const createMyLogsRouter = ({
  service,
  reviews,
  requireAuth,
}: Deps & { reviews: ReviewsService }): Router => {
  const router = Router();
  router.use(requireAuth);

  router.get("/", validate({ query: GameIdQuerySchema }), async (req, res) => {
    const { gameId } = req.valid!.query as { gameId: number };
    res.json(await service.bundleForUser(callerId(req), gameId));
  });

  router.post(
    "/",
    validate({ body: GameLogCreateSchema }),
    async (req, res) => {
      const input = req.valid!.body as z.infer<typeof GameLogCreateSchema>;
      res.status(201).json(await service.create(callerId(req), input));
    },
  );

  router.put(
    "/:logId",
    validate({ params: LogIdParamSchema, body: GameLogInputSchema }),
    async (req, res) => {
      const { logId } = req.valid!.params as { logId: number };
      const input = req.valid!.body as z.infer<typeof GameLogInputSchema>;
      res.json(await service.replace(callerId(req), logId, input));
    },
  );

  router.patch(
    "/:logId",
    validate({ params: LogIdParamSchema, body: GameLogPatchSchema }),
    async (req, res) => {
      const { logId } = req.valid!.params as { logId: number };
      const input = req.valid!.body as z.infer<typeof GameLogPatchSchema>;
      res.json(await service.patch(callerId(req), logId, input));
    },
  );

  router.delete(
    "/:logId",
    validate({ params: LogIdParamSchema }),
    async (req, res) => {
      const { logId } = req.valid!.params as { logId: number };
      await service.remove(callerId(req), logId);
      res.status(204).end();
    },
  );

  router.get(
    "/:logId/review",
    validate({ params: LogIdParamSchema }),
    async (req, res) => {
      const { logId } = req.valid!.params as { logId: number };
      res.json(await reviews.getForLog(callerId(req), logId));
    },
  );

  router.put(
    "/:logId/review",
    validate({ params: LogIdParamSchema, body: ReviewInputSchema }),
    async (req, res) => {
      const { logId } = req.valid!.params as { logId: number };
      const input = req.valid!.body as z.infer<typeof ReviewInputSchema>;
      const { review, created } = await reviews.upsertForLog(
        callerId(req),
        logId,
        input,
      );
      res.status(created ? 201 : 200).json(review);
    },
  );

  router.delete(
    "/:logId/review",
    validate({ params: LogIdParamSchema }),
    async (req, res) => {
      const { logId } = req.valid!.params as { logId: number };
      await reviews.deleteForLog(callerId(req), logId);
      res.status(204).end();
    },
  );

  return router;
};

/** Mounted at /me/shelf. A page of games, each with all its logs. */
export const createMyShelfRouter = ({ service, requireAuth }: Deps): Router => {
  const router = Router();

  router.get(
    "/",
    requireAuth,
    validate({ query: ListQuerySchema }),
    async (req, res) => {
      const { status, playedStatus, sort, direction, ...pagination } = req
        .valid!.query as z.infer<typeof ListQuerySchema>;
      res.json(
        await service.shelfForUser(
          callerId(req),
          { status, playedStatus, sort, direction },
          pagination,
        ),
      );
    },
  );

  return router;
};

/** Mounted at /users/:username/shelf. */
export const createUserShelfRouter = ({
  service,
  optionalAuth,
}: Deps): Router => {
  const router = Router({ mergeParams: true });

  router.get(
    "/",
    optionalAuth,
    validate({ params: UsernameParamSchema, query: ListQuerySchema }),
    async (req, res) => {
      const { username } = req.valid!.params as { username: string };
      const { status, playedStatus, sort, direction, ...pagination } = req
        .valid!.query as z.infer<typeof ListQuerySchema>;
      res.json(
        await service.shelfForUsername(
          username,
          { status, playedStatus, sort, direction },
          pagination,
        ),
      );
    },
  );

  return router;
};

/** Mounted at /users/:username/logs. Someone's logs of one game. */
export const createUserLogsRouter = ({
  service,
  optionalAuth,
}: Deps): Router => {
  const router = Router({ mergeParams: true });

  router.get(
    "/",
    optionalAuth,
    validate({ params: UsernameParamSchema, query: GameIdQuerySchema }),
    async (req, res) => {
      const { username } = req.valid!.params as { username: string };
      const { gameId } = req.valid!.query as { gameId: number };
      res.json(
        await service.bundleForUsername(username, gameId, req.auth?.userId),
      );
    },
  );

  return router;
};

/** Mounted at /me/game-logs. Addressed by game, from before a game could
 *  have a log per console; old clients still call it. */
export const createMyGameLogsRouter = ({
  service,
  requireAuth,
}: Deps): Router => {
  const router = Router();
  router.use(requireAuth);

  router.get("/", validate({ query: ListQuerySchema }), async (req, res) => {
    const { status, playedStatus, sort, direction, ...pagination } = req.valid!
      .query as z.infer<typeof ListQuerySchema>;
    res.json(
      await service.listForUser(
        callerId(req),
        { status, playedStatus, sort, direction },
        pagination,
      ),
    );
  });

  /* Before /:gameId, or "ids" is parsed as a game id. */
  router.get("/ids", async (req, res) => {
    res.json({ data: await service.listSummariesForUser(callerId(req)) });
  });

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
    validate({ params: GameIdParamSchema, body: GameLogInputSchema }),
    async (req, res) => {
      const { gameId } = req.valid!.params as { gameId: number };
      const input = req.valid!.body as z.infer<typeof GameLogInputSchema>;
      const { log, created } = await service.upsertOwn(
        callerId(req),
        gameId,
        input,
      );
      res.status(created ? 201 : 200).json(log);
    },
  );

  router.patch(
    "/:gameId",
    validate({ params: GameIdParamSchema, body: GameLogPatchSchema }),
    async (req, res) => {
      const { gameId } = req.valid!.params as { gameId: number };
      const input = req.valid!.body as z.infer<typeof GameLogPatchSchema>;
      res.json(await service.patchOwn(callerId(req), gameId, input));
    },
  );

  router.delete(
    "/:gameId",
    validate({ params: GameIdParamSchema }),
    async (req, res) => {
      const { gameId } = req.valid!.params as { gameId: number };
      await service.deleteOwn(callerId(req), gameId);
      // 204 carries no body; sending JSON with it is silently discarded
      res.status(204).end();
    },
  );

  return router;
};

/** Mounted at /users/:username/game-logs. One row per log. */
export const createUserGameLogsRouter = ({
  service,
  optionalAuth,
}: Deps): Router => {
  const router = Router({ mergeParams: true });

  router.get(
    "/",
    optionalAuth,
    validate({ params: UsernameParamSchema, query: ListQuerySchema }),
    async (req, res) => {
      const { username } = req.valid!.params as { username: string };
      const { status, playedStatus, sort, direction, ...pagination } = req
        .valid!.query as z.infer<typeof ListQuerySchema>;
      res.json(
        await service.listForUsername(
          username,
          { status, playedStatus, sort, direction },
          pagination,
        ),
      );
    },
  );

  return router;
};

/** Mounted at /users/:username/stats. */
export const createUserStatsRouter = ({
  service,
  optionalAuth,
}: Deps): Router => {
  const router = Router({ mergeParams: true });

  router.get(
    "/",
    optionalAuth,
    validate({ params: UsernameParamSchema, query: UserStatsQuerySchema }),
    async (req, res) => {
      const { username } = req.valid!.params as { username: string };
      const { year } = req.valid!.query as z.infer<typeof UserStatsQuerySchema>;
      res.json(await service.statsForUsername(username, year));
    },
  );

  return router;
};
