import express, { Router, type RequestHandler } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import {
  COMMUNITY_IMAGE_MAX_BYTES,
  COMMUNITY_IMAGE_MIME,
  CreateMessageInputSchema,
  CreateThreadInputSchema,
  MessageIdParamSchema,
  ThreadIdParamSchema,
  ThreadListQuerySchema,
  UpdateMessageInputSchema,
  UsernameParamSchema,
  type CreateMessageInput,
  type CreateThreadInput,
  type ThreadListQuery,
  type UpdateMessageInput,
} from "@playrates/shared";
import { validate } from "../../middleware/validate.js";
import { AppError } from "../../lib/AppError.js";
import type { CommunityService } from "./community.service.js";

interface Deps {
  service: CommunityService;
  requireAuth: RequestHandler;
  optionalAuth: RequestHandler;
}

const callerId = (req: Parameters<RequestHandler>[0]): string => {
  const id = req.auth?.userId;
  if (!id) throw AppError.unauthorized();
  return id;
};

const TrendingQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(10).default(3),
});

const UserThreadsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(5),
});

// Same shape as the avatar upload: one already-compressed image, raw bytes.
const imageBody = express.raw({
  type: COMMUNITY_IMAGE_MIME,
  limit: COMMUNITY_IMAGE_MAX_BYTES,
});

const perMinute = (limit: number) =>
  rateLimit({
    windowMs: 60_000,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  });

/** Mounted at /community. */
export const createCommunityRouter = ({
  service,
  requireAuth,
  optionalAuth,
}: Deps): Router => {
  const router = Router();
  // Per router rather than per module, so each app built counts afresh.
  const imageLimiter = perMinute(20);
  // Posting is cheap for us and expensive for everyone reading.
  const postLimiter = perMinute(20);

  router.get(
    "/threads",
    optionalAuth,
    validate({ query: ThreadListQuerySchema }),
    async (req, res) => {
      const query = req.valid!.query as ThreadListQuery;
      res.json(await service.listThreads(query, req.auth?.userId));
    },
  );

  router.get(
    "/trending",
    optionalAuth,
    validate({ query: TrendingQuerySchema }),
    async (req, res) => {
      const { limit } = req.valid!.query as { limit: number };
      res.json(await service.trending(limit, req.auth?.userId));
    },
  );

  router.get("/patch-notes", async (_req, res) => {
    res.json(await service.patchNotes());
  });

  router.post(
    "/threads",
    requireAuth,
    postLimiter,
    validate({ body: CreateThreadInputSchema }),
    async (req, res) => {
      const input = req.valid!.body as CreateThreadInput;
      res.status(201).json(await service.createThread(callerId(req), input));
    },
  );

  router.get(
    "/threads/:threadId",
    optionalAuth,
    validate({ params: ThreadIdParamSchema }),
    async (req, res) => {
      const { threadId } = req.valid!.params as { threadId: number };
      res.json(await service.getThread(threadId, req.auth?.userId));
    },
  );

  router.delete(
    "/threads/:threadId",
    requireAuth,
    validate({ params: ThreadIdParamSchema }),
    async (req, res) => {
      const { threadId } = req.valid!.params as { threadId: number };
      await service.deleteThread(callerId(req), threadId);
      res.status(204).end();
    },
  );

  router.post(
    "/threads/:threadId/messages",
    requireAuth,
    postLimiter,
    validate({ params: ThreadIdParamSchema, body: CreateMessageInputSchema }),
    async (req, res) => {
      const { threadId } = req.valid!.params as { threadId: number };
      const input = req.valid!.body as CreateMessageInput;
      res
        .status(201)
        .json(await service.postMessage(callerId(req), threadId, input));
    },
  );

  router.patch(
    "/messages/:messageId",
    requireAuth,
    validate({ params: MessageIdParamSchema, body: UpdateMessageInputSchema }),
    async (req, res) => {
      const { messageId } = req.valid!.params as { messageId: number };
      const { body } = req.valid!.body as UpdateMessageInput;
      res.json(await service.editMessage(callerId(req), messageId, body));
    },
  );

  router.delete(
    "/messages/:messageId",
    requireAuth,
    validate({ params: MessageIdParamSchema }),
    async (req, res) => {
      const { messageId } = req.valid!.params as { messageId: number };
      await service.deleteMessage(callerId(req), messageId);
      res.status(204).end();
    },
  );

  router.post(
    "/messages/:messageId/vote",
    requireAuth,
    validate({ params: MessageIdParamSchema }),
    async (req, res) => {
      const { messageId } = req.valid!.params as { messageId: number };
      res.json(await service.toggleVote(callerId(req), messageId));
    },
  );

  router.post(
    "/images",
    requireAuth,
    imageLimiter,
    imageBody,
    async (req, res) => {
      // express.raw leaves an empty object where the type did not match.
      const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
      res.status(201).json(await service.uploadImage(callerId(req), body));
    },
  );

  return router;
};

/** Mounted at /users/:username/community-threads. */
export const createUserThreadsRouter = ({ service }: Deps): Router => {
  const router = Router({ mergeParams: true });

  router.get(
    "/",
    validate({ params: UsernameParamSchema, query: UserThreadsQuerySchema }),
    async (req, res) => {
      const { username } = req.valid!.params as { username: string };
      const { limit } = req.valid!.query as { limit: number };
      res.json(await service.listByUsername(username, limit));
    },
  );

  return router;
};
