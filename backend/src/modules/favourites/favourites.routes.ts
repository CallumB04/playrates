import { Router, type RequestHandler } from "express";
import {
  SetFavouriteGamesSchema,
  UsernameParamSchema,
  type SetFavouriteGamesInput,
} from "@playrates/shared";
import { AppError } from "../../lib/AppError.js";
import { validate } from "../../middleware/validate.js";
import type { FavouritesService } from "./favourites.service.js";

interface Deps {
  service: FavouritesService;
  requireAuth: RequestHandler;
  optionalAuth: RequestHandler;
}

const callerId = (req: Parameters<RequestHandler>[0]): string => {
  const id = req.auth?.userId;
  if (!id) throw AppError.unauthorized();
  return id;
};

/** Mounted at /users/:username/favourites. */
export const createUserFavouritesRouter = ({
  service,
  optionalAuth,
}: Deps): Router => {
  const router = Router({ mergeParams: true });

  router.get(
    "/",
    optionalAuth,
    validate({ params: UsernameParamSchema }),
    async (req, res) => {
      const { username } = req.valid!.params as { username: string };
      res.json(await service.listForUsername(username, req.auth?.userId));
    },
  );

  return router;
};

/** Mounted at /me/favourites. */
export const createMyFavouritesRouter = ({
  service,
  requireAuth,
}: Deps): Router => {
  const router = Router();

  router.put(
    "/",
    requireAuth,
    validate({ body: SetFavouriteGamesSchema }),
    async (req, res) => {
      const { gameIds } = req.valid!.body as SetFavouriteGamesInput;
      res.json(await service.setOwn(callerId(req), gameIds));
    },
  );

  return router;
};
