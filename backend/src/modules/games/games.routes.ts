import { Router, type RequestHandler } from "express";
import rateLimit from "express-rate-limit";
import {
    GameIdParamSchema,
    GameImportSchema,
    GameQuerySchema,
    GameSearchSchema,
} from "@playrates/shared";
import type { z } from "zod";
import { validate } from "../../middleware/validate.js";
import type { GamesService } from "./games.service.js";

interface Deps {
    service: GamesService;
    requireAuth: RequestHandler;
    optionalAuth: RequestHandler;
}

/**
 * Search is the only route that can reach the upstream provider, so it is the
 * only one that needs a tight limit of its own.
 */
const searchLimiter = rateLimit({
    windowMs: 60_000,
    limit: 30,
    standardHeaders: "draft-7",
    legacyHeaders: false,
});

export const createGamesRouter = ({
    service,
    requireAuth,
    optionalAuth,
}: Deps): Router => {
    const router = Router();

    // "/search" must precede "/:gameId" or it parses as an id
    router.get(
        "/search",
        requireAuth,
        searchLimiter,
        validate({ query: GameSearchSchema }),
        async (req, res) => {
            const { q, remote, ...pagination } = req.valid!.query as z.infer<
                typeof GameSearchSchema
            >;
            res.json(await service.search(q, pagination, remote));
        }
    );

    router.post(
        "/import",
        requireAuth,
        searchLimiter,
        validate({ body: GameImportSchema }),
        async (req, res) => {
            const { rawgId } = req.valid!.body as z.infer<typeof GameImportSchema>;
            const { game, created } = await service.importByRawgId(rawgId);
            res.status(created ? 201 : 200).json(game);
        }
    );

    router.get(
        "/",
        optionalAuth,
        validate({ query: GameQuerySchema }),
        async (req, res) => {
            const query = req.valid!.query as z.infer<typeof GameQuerySchema>;
            res.json(await service.list(query, req.auth?.userId));
        }
    );

    router.get(
        "/:gameId",
        validate({ params: GameIdParamSchema }),
        async (req, res) => {
            const { gameId } = req.valid!.params as { gameId: number };
            res.json(await service.getById(gameId));
        }
    );

    router.get(
        "/:gameId/stats",
        validate({ params: GameIdParamSchema }),
        async (req, res) => {
            const { gameId } = req.valid!.params as { gameId: number };
            res.json(await service.getStats(gameId));
        }
    );

    return router;
};
