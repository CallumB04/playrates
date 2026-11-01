import { Router, type RequestHandler } from "express";
import {
  Gaming25ImageQuerySchema,
  gaming25ImageQueryVersion,
  Gaming25PickParamSchema,
  MostLovedGaming25sQuerySchema,
  SetGaming25PickSchema,
  UsernameParamSchema,
  type Gaming25Category,
  type Gaming25ImageLayout,
} from "@playrates/shared";
import { AppError } from "../../lib/AppError.js";
import { redirectToVersion } from "../../lib/imageVersion.js";
import { PICTURE_CACHE } from "../../lib/pictureCache.js";
import { perMinute } from "../../lib/rateLimit.js";
import { validate } from "../../middleware/validate.js";
import { renderGaming25 } from "./gaming25.image.js";
import type { Gaming25Service } from "./gaming25.service.js";

interface Deps {
  service: Gaming25Service;
  requireAuth: RequestHandler;
  optionalAuth: RequestHandler;
}

const callerId = (req: Parameters<RequestHandler>[0]): string => {
  const id = req.auth?.userId;
  if (!id) throw AppError.unauthorized();
  return id;
};

/** Mounted at /users/:username/gaming-25. */
export const createUserGaming25Router = ({
  service,
  requireAuth,
  optionalAuth,
}: Deps): Router => {
  const router = Router({ mergeParams: true });

  router.get(
    "/",
    optionalAuth,
    validate({ params: UsernameParamSchema }),
    async (req, res) => {
      const { username } = req.valid!.params as { username: string };
      res.json(await service.forUsername(username, req.auth?.userId));
    },
  );

  router.post(
    "/love",
    requireAuth,
    validate({ params: UsernameParamSchema }),
    async (req, res) => {
      const { username } = req.valid!.params as { username: string };
      res.json(await service.toggleLove(callerId(req), username));
    },
  );

  return router;
};

/** Mounted at /me/gaming-25. */
export const createMyGaming25Router = ({
  service,
  requireAuth,
}: Deps): Router => {
  const router = Router();

  router.put(
    "/picks/:category",
    requireAuth,
    validate({ params: Gaming25PickParamSchema, body: SetGaming25PickSchema }),
    async (req, res) => {
      const { category } = req.valid!.params as { category: Gaming25Category };
      const { gameId } = req.valid!.body as { gameId: number };
      res.json(await service.setPick(callerId(req), category, gameId));
    },
  );

  router.delete(
    "/picks/:category",
    requireAuth,
    validate({ params: Gaming25PickParamSchema }),
    async (req, res) => {
      const { category } = req.valid!.params as { category: Gaming25Category };
      res.json(await service.clearPick(callerId(req), category));
    },
  );

  return router;
};

/** Mounted at /gaming-25: the most loved, and the shared picture. */
export const createGaming25Router = ({ service }: Deps): Router => {
  const router = Router();

  router.get(
    "/most-loved",
    validate({ query: MostLovedGaming25sQuerySchema }),
    async (req, res) => {
      const { limit } = req.valid!.query as { limit: number };
      res.json(await service.mostLoved(limit));
    },
  );

  router.get(
    "/:username/image.png",
    perMinute("gaming25-image", 30),
    validate({ params: UsernameParamSchema, query: Gaming25ImageQuerySchema }),
    async (req, res) => {
      const { username } = req.valid!.params as { username: string };
      const { layout, v } = req.valid!.query as {
        layout: Gaming25ImageLayout;
        v?: string;
      };
      const grid = await service.publicCells(username);
      if (!grid) throw AppError.notFound("Gaming 25");
      const current = gaming25ImageQueryVersion(grid.updatedAt, grid.cardTheme);
      if (redirectToVersion(req, res, current)) return;
      const png = await renderGaming25(grid, layout, fetch, grid.cardTheme);
      res
        .type("png")
        .setHeader(
          "Cache-Control",
          v ? PICTURE_CACHE.versioned : PICTURE_CACHE.unversioned,
        )
        // Made to be shown anywhere, not only on the site's own origin.
        .setHeader("Cross-Origin-Resource-Policy", "cross-origin")
        .send(png);
    },
  );

  return router;
};
