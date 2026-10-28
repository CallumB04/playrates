import { Router, type RequestHandler } from "express";
import {
  CARD_THEME_KEYS,
  LeaderboardQuerySchema,
  ReferralSchema,
  RerollParamSchema,
  SeenSchema,
  ShopItemParamSchema,
  StyleSchema,
  UsernameParamSchema,
  type CardThemeKey,
  type LeaderboardPeriod,
  type StyleInput,
} from "@playrates/shared";
import { z } from "zod";
import { AppError } from "../../lib/AppError.js";
import { validate } from "../../middleware/validate.js";
import { renderPlayerCard } from "./progress.image.js";
import type { ProgressService } from "./progress.service.js";

interface Deps {
  service: ProgressService;
  requireAuth: RequestHandler;
  optionalAuth: RequestHandler;
}

const callerId = (req: Parameters<RequestHandler>[0]): string => {
  const id = req.auth?.userId;
  if (!id) throw AppError.unauthorized();
  return id;
};

const CardQuerySchema = z.object({
  theme: z.enum(CARD_THEME_KEYS).optional(),
  v: z.string().max(64).optional(),
});

/** Mounted at /me: your own progress, style, quests and invite. */
export const createMyProgressRouter = ({
  service,
  requireAuth,
}: Deps): Router => {
  const router = Router();

  router.get("/progress", requireAuth, async (req, res) => {
    res.json(await service.evaluate(callerId(req)));
  });

  router.post(
    "/progress/seen",
    requireAuth,
    validate({ body: SeenSchema }),
    async (req, res) => {
      await service.markSeen(callerId(req), req.valid!.body as never);
      res.status(204).end();
    },
  );

  router.post("/progress/revealed", requireAuth, async (req, res) => {
    await service.markRevealed(callerId(req));
    res.status(204).end();
  });

  router.patch(
    "/progress/style",
    requireAuth,
    validate({ body: StyleSchema }),
    async (req, res) => {
      await service.setStyle(callerId(req), req.valid!.body as StyleInput);
      res.status(204).end();
    },
  );

  router.get(
    "/leaderboard",
    requireAuth,
    validate({ query: LeaderboardQuerySchema }),
    async (req, res) => {
      const { period } = req.valid!.query as { period: LeaderboardPeriod };
      res.json(await service.leaderboard(callerId(req), period));
    },
  );

  router.post(
    "/quests/:period/:slot/reroll",
    requireAuth,
    validate({ params: RerollParamSchema }),
    async (req, res) => {
      const { period, slot } = req.valid!.params as {
        period: "week" | "month";
        slot: number;
      };
      await service.reroll(callerId(req), period, slot);
      res.status(204).end();
    },
  );

  router.post(
    "/referral",
    requireAuth,
    validate({ body: ReferralSchema }),
    async (req, res) => {
      const { username } = req.valid!.body as { username: string };
      await service.refer(callerId(req), username);
      res.status(204).end();
    },
  );

  return router;
};

/** Mounted at /shop. */
export const createShopRouter = ({ service, requireAuth }: Deps): Router => {
  const router = Router();

  router.get("/", requireAuth, async (req, res) => {
    res.json(await service.shop(callerId(req)));
  });

  router.post(
    "/:item/buy",
    requireAuth,
    validate({ params: ShopItemParamSchema }),
    async (req, res) => {
      const { item } = req.valid!.params as { item: string };
      res.json(await service.buy(callerId(req), item));
    },
  );

  return router;
};

// A versioned card names one state of it, so it never goes stale.
const VERSIONED_CACHE = "public, max-age=31536000, immutable";
const UNVERSIONED_CACHE =
  "public, max-age=300, s-maxage=300, stale-while-revalidate=86400";

/** Mounted at /progress: the rules, someone's badges, their card. */
export const createProgressRouter = ({
  service,
  optionalAuth,
}: Deps): Router => {
  const router = Router();

  router.get("/rules", async (_req, res) => {
    res.json(await service.rules());
  });

  router.get(
    "/:username/badges",
    optionalAuth,
    validate({ params: UsernameParamSchema }),
    async (req, res) => {
      const { username } = req.valid!.params as { username: string };
      res.json(await service.badgesFor(username, req.auth?.userId));
    },
  );

  router.get(
    "/:username/card.png",
    validate({ params: UsernameParamSchema, query: CardQuerySchema }),
    async (req, res) => {
      const { username } = req.valid!.params as { username: string };
      const { theme, v } = req.valid!.query as {
        theme?: CardThemeKey;
        v?: string;
      };
      const source = await service.cardSource(username);
      if (!source) throw AppError.notFound("Profile");
      const png = await renderPlayerCard(source, theme);
      res
        .type("png")
        .setHeader("Cache-Control", v ? VERSIONED_CACHE : UNVERSIONED_CACHE)
        // Made to be shown anywhere, not only on the site's own origin.
        .setHeader("Cross-Origin-Resource-Policy", "cross-origin")
        .send(png);
    },
  );

  return router;
};
