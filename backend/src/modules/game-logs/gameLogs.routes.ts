import { Router, type RequestHandler } from "express";
import {
  GameIdParamSchema,
  GameLogInputSchema,
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

/** Mounted at /me/game-logs. */
export const createMyGameLogsRouter = ({
  service,
  requireAuth,
}: Deps): Router => {
  const router = Router();
  router.use(requireAuth);

  router.get("/", validate({ query: ListQuerySchema }), async (req, res) => {
    const { status, ...pagination } = req.valid!.query as z.infer<
      typeof ListQuerySchema
    >;
    res.json(await service.listForUser(callerId(req), status, pagination));
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

/** Mounted at /users/:username/game-logs. */
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
      const { status, ...pagination } = req.valid!.query as z.infer<
        typeof ListQuerySchema
      >;
      res.json(await service.listForUsername(username, status, pagination));
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
