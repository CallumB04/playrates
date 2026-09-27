import { Router, type RequestHandler } from "express";
import { z } from "zod";
import {
  AdminReportsQuerySchema,
  CreateReportSchema,
  ResolveReportSchema,
} from "@playrates/shared";
import { AppError } from "../../lib/AppError.js";
import { perMinute } from "../../lib/rateLimit.js";
import { validate } from "../../middleware/validate.js";
import type { ReportsService } from "./reports.service.js";

const callerId = (req: { auth?: { userId: string } }): string => {
  const id = req.auth?.userId;
  if (!id) throw AppError.unauthorized();
  return id;
};

const ReportIdParamSchema = z.object({
  reportId: z.coerce.number().int().positive(),
});

/** Mounted at /reports. */
export const createReportsRouter = ({
  service,
  requireAuth,
}: {
  service: ReportsService;
  requireAuth: RequestHandler;
}): Router => {
  const router = Router();
  const reportLimiter = perMinute(10);

  router.post(
    "/",
    requireAuth,
    reportLimiter,
    validate({ body: CreateReportSchema }),
    async (req, res) => {
      const input = req.valid!.body as z.infer<typeof CreateReportSchema>;
      await service.create(callerId(req), input);
      res.status(201).end();
    },
  );

  return router;
};

/** Mounted at /admin/reports, behind the admin gate. */
export const createAdminReportsRouter = ({
  service,
}: {
  service: ReportsService;
}): Router => {
  const router = Router();

  router.get(
    "/",
    validate({ query: AdminReportsQuerySchema }),
    async (req, res) => {
      const query = req.valid!.query as z.infer<typeof AdminReportsQuerySchema>;
      res.json(await service.list(query));
    },
  );

  router.patch(
    "/:reportId",
    validate({ params: ReportIdParamSchema, body: ResolveReportSchema }),
    async (req, res) => {
      const { reportId } = req.valid!.params as z.infer<
        typeof ReportIdParamSchema
      >;
      const input = req.valid!.body as z.infer<typeof ResolveReportSchema>;
      res.json(await service.resolve(callerId(req), reportId, input));
    },
  );

  return router;
};
