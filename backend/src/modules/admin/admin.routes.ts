import { Router } from "express";
import {
  AdminActivityQuerySchema,
  AdminGameEventsQuerySchema,
  AdminGameIdParamSchema,
  AdminGamePatchSchema,
  AdminGameSearchQuerySchema,
  AdminImportSchema,
  AdminMetricParamSchema,
  AdminPullSchema,
  AdminRangeQuerySchema,
  AdminUserIdParamSchema,
  AdminUsersQuerySchema,
  AnnouncementIdParamSchema,
  AnnouncementInputSchema,
  PatchNoteIdParamSchema,
  CursorQuerySchema,
} from "@playrates/shared";
import type { z } from "zod";
import { AppError } from "../../lib/AppError.js";
import { validate } from "../../middleware/validate.js";
import type { AdminService } from "./admin.service.js";

const callerId = (req: { auth?: { userId: string } }): string => {
  const id = req.auth?.userId;
  if (!id) throw AppError.unauthorized();
  return id;
};

/**
 * Every admin endpoint. Mounted behind requireAuth and requireAdmin in
 * routes.ts, so the gate is in one place and nothing added here can miss it.
 */
export const createAdminRouter = ({ service }: { service: AdminService }): Router => {
  const router = Router();

  // Stats -------------------------------------------------------------------

  router.get(
    "/stats/overview",
    validate({ query: AdminRangeQuerySchema }),
    async (req, res) => {
      const { range } = req.valid!.query as z.infer<typeof AdminRangeQuerySchema>;
      res.json(await service.overview(range));
    },
  );

  router.get(
    "/stats/:metric",
    validate({ params: AdminMetricParamSchema, query: AdminRangeQuerySchema }),
    async (req, res) => {
      const { metric } = req.valid!.params as z.infer<typeof AdminMetricParamSchema>;
      const { range } = req.valid!.query as z.infer<typeof AdminRangeQuerySchema>;
      res.json(await service.metricDetail(metric, range));
    },
  );

  // People ------------------------------------------------------------------

  router.get(
    "/activity",
    validate({ query: AdminActivityQuerySchema }),
    async (req, res) => {
      res.json(
        await service.activity(
          req.valid!.query as z.infer<typeof AdminActivityQuerySchema>,
        ),
      );
    },
  );

  router.get(
    "/users",
    validate({ query: AdminUsersQuerySchema }),
    async (req, res) => {
      res.json(
        await service.users(req.valid!.query as z.infer<typeof AdminUsersQuerySchema>),
      );
    },
  );

  router.get(
    "/users/:id",
    validate({ params: AdminUserIdParamSchema }),
    async (req, res) => {
      const { id } = req.valid!.params as z.infer<typeof AdminUserIdParamSchema>;
      res.json(await service.user(id));
    },
  );

  // Catalogue ---------------------------------------------------------------

  router.get(
    "/games/events",
    validate({ query: AdminGameEventsQuerySchema }),
    async (req, res) => {
      res.json(
        await service.gameEvents(
          req.valid!.query as z.infer<typeof AdminGameEventsQuerySchema>,
        ),
      );
    },
  );

  router.get("/games/igdb-usage", async (_req, res) => {
    res.json(await service.igdbUsage());
  });

  router.get(
    "/games/search",
    validate({ query: AdminGameSearchQuerySchema }),
    async (req, res) => {
      const { q } = req.valid!.query as z.infer<typeof AdminGameSearchQuerySchema>;
      res.json(await service.searchGames(q));
    },
  );

  router.post(
    "/games/pull",
    validate({ body: AdminPullSchema }),
    async (req, res) => {
      const input = req.valid!.body as z.infer<typeof AdminPullSchema>;
      res.json(await service.pull(input, callerId(req)));
    },
  );

  router.post(
    "/games/import",
    validate({ body: AdminImportSchema }),
    async (req, res) => {
      const { igdbId } = req.valid!.body as z.infer<typeof AdminImportSchema>;
      const result = await service.importGame(igdbId, callerId(req));
      res.status(result.created ? 201 : 200).json(result);
    },
  );

  router.post(
    "/games/:id/resync",
    validate({ params: AdminGameIdParamSchema }),
    async (req, res) => {
      const { id } = req.valid!.params as z.infer<typeof AdminGameIdParamSchema>;
      res.json(await service.resync(id, callerId(req)));
    },
  );

  router.patch(
    "/games/:id",
    validate({ params: AdminGameIdParamSchema, body: AdminGamePatchSchema }),
    async (req, res) => {
      const { id } = req.valid!.params as z.infer<typeof AdminGameIdParamSchema>;
      const { isTrending } = req.valid!.body as z.infer<typeof AdminGamePatchSchema>;
      res.json(await service.setTrending(id, isTrending, callerId(req)));
    },
  );

  // Announcements -----------------------------------------------------------

  router.get("/announcements", async (_req, res) => {
    res.json(await service.listAnnouncements());
  });

  router.post(
    "/announcements",
    validate({ body: AnnouncementInputSchema }),
    async (req, res) => {
      const input = req.valid!.body as z.infer<typeof AnnouncementInputSchema>;
      res.status(201).json(await service.sendAnnouncement(input, callerId(req)));
    },
  );

  router.post(
    "/announcements/test",
    validate({ body: AnnouncementInputSchema }),
    async (req, res) => {
      const input = req.valid!.body as z.infer<typeof AnnouncementInputSchema>;
      await service.sendTestAnnouncement(input, callerId(req));
      res.status(204).end();
    },
  );

  router.post(
    "/announcements/:id/retract",
    validate({ params: AnnouncementIdParamSchema }),
    async (req, res) => {
      const { id } = req.valid!.params as z.infer<typeof AnnouncementIdParamSchema>;
      res.json(await service.retractAnnouncement(id));
    },
  );

  // Patch notes -------------------------------------------------------------
  // Each entry goes out as an announcement, so retracting one is the
  // announcement's own retract above.

  router.get("/patch-notes", async (_req, res) => {
    res.json(await service.listPatchNotes());
  });

  router.post(
    "/patch-notes/:messageId/announce",
    validate({ params: PatchNoteIdParamSchema }),
    async (req, res) => {
      const { messageId } = req.valid!.params as z.infer<typeof PatchNoteIdParamSchema>;
      res.status(201).json(await service.sendPatchNote(messageId, callerId(req)));
    },
  );

  router.post(
    "/patch-notes/:messageId/test",
    validate({ params: PatchNoteIdParamSchema }),
    async (req, res) => {
      const { messageId } = req.valid!.params as z.infer<typeof PatchNoteIdParamSchema>;
      await service.sendTestPatchNote(messageId, callerId(req));
      res.status(204).end();
    },
  );

  // Health ------------------------------------------------------------------

  router.get("/health", async (_req, res) => {
    res.json(await service.health());
  });

  router.get(
    "/errors",
    validate({ query: CursorQuerySchema }),
    async (req, res) => {
      const { before, limit } = req.valid!.query as z.infer<typeof CursorQuerySchema>;
      res.json(await service.serverErrors(before, limit));
    },
  );

  return router;
};
