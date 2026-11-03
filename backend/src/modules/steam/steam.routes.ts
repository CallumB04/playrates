import { Router, type RequestHandler } from "express";
import type { z } from "zod";
import {
  SteamAchievementsSchema,
  SteamImportSchema,
  SteamPreviewSchema,
} from "@playrates/shared";
import { AppError } from "../../lib/AppError.js";
import { perMinute } from "../../lib/rateLimit.js";
import { validate } from "../../middleware/validate.js";
import type { SteamService } from "./steam.service.js";

const callerId = (req: { auth?: { userId: string } }): string => {
  const id = req.auth?.userId;
  if (!id) throw AppError.unauthorized();
  return id;
};

/** Mounted at /me/steam. */
export const createSteamRouter = ({
  service,
  requireAuth,
}: {
  service: SteamService;
  requireAuth: RequestHandler;
}): Router => {
  const router = Router();
  router.use(requireAuth);

  router.get("/", (_req, res) => {
    res.json({ available: service.available() });
  });

  // Each one asks Steam and IGDB for a whole library.
  router.post(
    "/preview",
    perMinute("steam-preview", 6),
    validate({ body: SteamPreviewSchema }),
    async (req, res) => {
      const { profile } = req.valid!.body as z.infer<typeof SteamPreviewSchema>;
      res.json(await service.preview(callerId(req), profile));
    },
  );

  // A batch of a library's achievements, which the preview asks for in
  // turn: each is one Steam request a game.
  router.post(
    "/achievements",
    perMinute("steam-achievements", 60),
    validate({ body: SteamAchievementsSchema }),
    async (req, res) => {
      callerId(req);
      const { steamId, appids } = req.valid!.body as z.infer<
        typeof SteamAchievementsSchema
      >;
      res.json(await service.achievements(steamId, appids));
    },
  );

  router.post(
    "/import",
    validate({ body: SteamImportSchema }),
    async (req, res) => {
      const input = req.valid!.body as z.infer<typeof SteamImportSchema>;
      res.json(await service.import(callerId(req), input));
    },
  );

  return router;
};
