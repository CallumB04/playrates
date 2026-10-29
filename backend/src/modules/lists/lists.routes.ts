import { Router, type RequestHandler } from "express";
import { z } from "zod";
import {
  AddListGameSchema,
  CreateListSchema,
  GameIdParamSchema,
  GameListsQuerySchema,
  ListGameParamSchema,
  ListIdParamSchema,
  ListsQuerySchema,
  MyListsQuerySchema,
  PaginationSchema,
  SetListGamesSchema,
  UpdateListSchema,
  UsernameParamSchema,
  type CreateListInput,
  type ListSort,
  type UpdateListInput,
} from "@playrates/shared";
import { AppError } from "../../lib/AppError.js";
import { validate } from "../../middleware/validate.js";
import type { ProfilesRepository } from "../profiles/profiles.repository.js";
import { ownerTheme, renderListImage } from "./lists.image.js";
import type { ListsService } from "./lists.service.js";

interface Deps {
  service: ListsService;
  requireAuth: RequestHandler;
  optionalAuth: RequestHandler;
  /** For the owner's card theme on the shared picture; without it, the
   *  default. */
  profiles?: Pick<ProfilesRepository, "findByUsername">;
}

const ListImageQuerySchema = z.object({
  /** Only there to change the URL when the list changes. */
  v: z.string().max(64).optional(),
});

// The version follows the list but not its owner's theme or avatar, so a
// versioned picture is kept a day rather than for good.
const VERSIONED_CACHE = "public, max-age=86400";
const UNVERSIONED_CACHE =
  "public, max-age=300, s-maxage=300, stale-while-revalidate=86400";

const callerId = (req: Parameters<RequestHandler>[0]): string => {
  const id = req.auth?.userId;
  if (!id) throw AppError.unauthorized();
  return id;
};

type Page = { sort: ListSort; page: number; limit: number };

/** Mounted at /users/:username/lists. */
export const createUserListsRouter = ({
  service,
  optionalAuth,
}: Deps): Router => {
  const router = Router({ mergeParams: true });

  router.get(
    "/",
    optionalAuth,
    validate({ params: UsernameParamSchema, query: ListsQuerySchema }),
    async (req, res) => {
      const { username } = req.valid!.params as { username: string };
      res.json(
        await service.listForUsername(
          username,
          req.auth?.userId,
          req.valid!.query as Page,
        ),
      );
    },
  );

  return router;
};

/** Mounted at /lists: one list by id, and the popular ones. */
export const createListsRouter = ({
  service,
  requireAuth,
  optionalAuth,
  profiles,
}: Deps): Router => {
  const router = Router();

  // Before /:listId, which would take "popular" for an id and refuse it.
  router.get(
    "/popular",
    optionalAuth,
    validate({ query: PaginationSchema }),
    async (req, res) => {
      res.json(
        await service.popular(
          req.valid!.query as { page: number; limit: number },
          req.auth?.userId,
        ),
      );
    },
  );

  router.get(
    "/:listId",
    optionalAuth,
    validate({ params: ListIdParamSchema }),
    async (req, res) => {
      const { listId } = req.valid!.params as { listId: number };
      res.json(await service.get(listId, req.auth?.userId));
    },
  );

  // Asked as nobody, whoever asks: the picture travels beyond the site, so
  // only a list anyone may see gets one.
  router.get(
    "/:listId/image",
    validate({ params: ListIdParamSchema, query: ListImageQuerySchema }),
    async (req, res) => {
      const { listId } = req.valid!.params as { listId: number };
      const { v } = req.valid!.query as { v?: string };
      const list = await service.get(listId);
      if (list.visibility !== "everyone") throw AppError.notFound("List");
      const png = await renderListImage(
        list,
        fetch,
        await ownerTheme(profiles, list.owner.username),
      );
      res
        .type("png")
        .setHeader("Cache-Control", v ? VERSIONED_CACHE : UNVERSIONED_CACHE)
        // Made to be shown anywhere, not only on the site's own origin.
        .setHeader("Cross-Origin-Resource-Policy", "cross-origin")
        .send(png);
    },
  );

  // A love, as a toggle: the same again takes it back, so the client needs
  // no current state and can't double-count. Lists don't take reactions.
  router.post(
    "/:listId/vote",
    requireAuth,
    validate({ params: ListIdParamSchema }),
    async (req, res) => {
      const { listId } = req.valid!.params as { listId: number };
      res.json(await service.toggleVote(callerId(req), listId));
    },
  );

  return router;
};

/** Mounted at /games/:gameId/lists. */
export const createGameListsRouter = ({
  service,
  optionalAuth,
}: Deps): Router => {
  const router = Router({ mergeParams: true });

  router.get(
    "/",
    optionalAuth,
    validate({ params: GameIdParamSchema, query: GameListsQuerySchema }),
    async (req, res) => {
      const { gameId } = req.valid!.params as { gameId: number };
      const { limit } = req.valid!.query as { limit: number };
      res.json(await service.forGame(gameId, limit, req.auth?.userId));
    },
  );

  return router;
};

/** Mounted at /me/lists. */
export const createMyListsRouter = ({ service, requireAuth }: Deps): Router => {
  const router = Router();
  router.use(requireAuth);

  router.get("/", validate({ query: MyListsQuerySchema }), async (req, res) => {
    const { gameId } = req.valid!.query as { gameId?: number };
    res.json(await service.mine(callerId(req), gameId));
  });

  router.post("/", validate({ body: CreateListSchema }), async (req, res) => {
    res
      .status(201)
      .json(
        await service.create(callerId(req), req.valid!.body as CreateListInput),
      );
  });

  router.patch(
    "/:listId",
    validate({ params: ListIdParamSchema, body: UpdateListSchema }),
    async (req, res) => {
      const { listId } = req.valid!.params as { listId: number };
      res.json(
        await service.update(
          callerId(req),
          listId,
          req.valid!.body as UpdateListInput,
        ),
      );
    },
  );

  router.delete(
    "/:listId",
    validate({ params: ListIdParamSchema }),
    async (req, res) => {
      const { listId } = req.valid!.params as { listId: number };
      await service.remove(callerId(req), listId);
      res.status(204).end();
    },
  );

  router.put(
    "/:listId/games",
    validate({ params: ListIdParamSchema, body: SetListGamesSchema }),
    async (req, res) => {
      const { listId } = req.valid!.params as { listId: number };
      const { gameIds } = req.valid!.body as { gameIds: number[] };
      res.json(await service.setGames(callerId(req), listId, gameIds));
    },
  );

  router.post(
    "/:listId/games",
    validate({ params: ListIdParamSchema, body: AddListGameSchema }),
    async (req, res) => {
      const { listId } = req.valid!.params as { listId: number };
      const { gameId } = req.valid!.body as { gameId: number };
      await service.addGame(callerId(req), listId, gameId);
      res.status(204).end();
    },
  );

  router.delete(
    "/:listId/games/:gameId",
    validate({ params: ListGameParamSchema }),
    async (req, res) => {
      const { listId, gameId } = req.valid!.params as {
        listId: number;
        gameId: number;
      };
      await service.removeGame(callerId(req), listId, gameId);
      res.status(204).end();
    },
  );

  return router;
};
