import { Router, type RequestHandler } from "express";
import type { z } from "zod";
import { SteamImportSchema, SteamPreviewSchema } from "@playrates/shared";
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
