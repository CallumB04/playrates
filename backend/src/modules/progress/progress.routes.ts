import { Router, type RequestHandler } from "express";
import {
  CARD_THEME_KEYS,
  LeaderboardQuerySchema,
  playerCardVersion,
  ReferralSchema,
  BuyBackgroundSchema,
  GiftSchema,
  SeenSchema,
  ShopItemParamSchema,
  StyleSchema,
  SwapQuestSchema,
  UsernameParamSchema,
  type CardThemeKey,
  type LeaderboardPeriod,
  type Metal,
  type StyleInput,
} from "@playrates/shared";
import { z } from "zod";
import { AppError } from "../../lib/AppError.js";
import { redirectToVersion } from "../../lib/imageVersion.js";
import { PICTURE_CACHE } from "../../lib/pictureCache.js";
import { perMinute } from "../../lib/rateLimit.js";
import { validate } from "../../middleware/validate.js";
import { renderMoment } from "./moment.image.js";
import { renderPlayerCard } from "./progress.image.js";
import type { MomentQuery, ProgressService } from "./progress.service.js";

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

const MomentQuerySchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("badge"),
    badge: z.string().min(1).max(40),
    metal: z.coerce
      .number()
      .int()
      .min(1)
      .max(4)
      .transform((m) => m as Metal),
  }),
  z.object({
    kind: z.literal("level"),
    level: z.coerce.number().int().min(1).max(1000),
  }),
  z.object({
    kind: z.literal("finished"),
    game: z.coerce.number().int().positive(),
  }),
  z.object({
    kind: z.literal("shelf"),
    count: z.coerce.number().int().min(1).max(100_000),
  }),
]);

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

  // A POST, not a GET: bringing progress up to date awards XP, badges and
  // tokens, and a GET is something a prefetcher may send unasked.
  router.post("/progress", requireAuth, async (req, res) => {
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

  router.post(
    "/progress/quests/swap",
    requireAuth,
    validate({ body: SwapQuestSchema }),
    async (req, res) => {
      const { slot } = req.valid!.body as { slot: number };
      res.json(await service.swapQuest(callerId(req), slot));
    },
  );

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

  router.get("/backgrounds", requireAuth, async (req, res) => {
    res.json(await service.backgrounds(callerId(req)));
  });

  router.post(
    "/backgrounds",
    requireAuth,
    validate({ body: BuyBackgroundSchema }),
    async (req, res) => {
      const { gameId, url } = req.valid!.body as {
        gameId: number;
        url: string;
      };
      res.json(await service.buyBackground(callerId(req), gameId, url));
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

  router.get(
    "/:item/friends",
    requireAuth,
    validate({ params: ShopItemParamSchema }),
    async (req, res) => {
      const { item } = req.valid!.params as { item: string };
      res.json(await service.giftFriends(callerId(req), item));
    },
  );

  router.post(
    "/:item/gift",
    requireAuth,
    validate({ params: ShopItemParamSchema, body: GiftSchema }),
    async (req, res) => {
      const { item } = req.valid!.params as { item: string };
      const { username } = req.valid!.body as { username: string };
      res.json(await service.gift(callerId(req), item, username));
    },
  );

  return router;
};

/** Mounted at /referrals: who an invite link is from, for anyone. */
export const createReferralsRouter = ({ service }: Deps): Router => {
  const router = Router();

  router.get(
    "/:username",
    validate({ params: UsernameParamSchema }),
    async (req, res) => {
      const { username } = req.valid!.params as { username: string };
      res.json(await service.invite(username));
    },
  );

  return router;
};

/** Mounted at /progress: the rules, someone's badges, their card. */
export const createProgressRouter = ({
  service,
  optionalAuth,
}: Deps): Router => {
  const router = Router();
  const imageLimiter = perMinute("card-image", 30);

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
    imageLimiter,
    validate({ params: UsernameParamSchema, query: CardQuerySchema }),
    async (req, res) => {
      const { username } = req.valid!.params as { username: string };
      const { theme, v } = req.valid!.query as {
        theme?: CardThemeKey;
        v?: string;
      };
      const source = await service.cardSource(username);
      if (!source) throw AppError.notFound("Profile");
      if (redirectToVersion(req, res, playerCardVersion(source.xp))) return;
      const png = await renderPlayerCard(source, theme);
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

  // A badge, a level, a finished game or a shelf milestone as a picture of
  // its own, for the share that offered it. Not versioned: what it shows
  // can move (a rating changed, a new picture), so it's kept a few minutes.
  router.get(
    "/:username/moment.png",
    imageLimiter,
    validate({ params: UsernameParamSchema, query: MomentQuerySchema }),
    async (req, res) => {
      const { username } = req.valid!.params as { username: string };
      const source = await service.momentSource(
        username,
        req.valid!.query as MomentQuery,
      );
      if (!source) throw AppError.notFound("Picture");
      const png = await renderMoment(source);
      res
        .type("png")
        .setHeader("Cache-Control", PICTURE_CACHE.unversioned)
        .setHeader("Cross-Origin-Resource-Policy", "cross-origin")
        .send(png);
    },
  );

  return router;
};
