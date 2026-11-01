import { Router, type RequestHandler } from "express";
import type { z } from "zod";
import { ClientErrorReportSchema } from "@playrates/shared";
import { perMinute } from "../../lib/rateLimit.js";
import { validate } from "../../middleware/validate.js";
import type { AdminRepository } from "./admin.repository.js";

/** Mounted at /client-errors. Open to anyone: a crash before sign-in is
 *  still a crash. */
export const createClientErrorsRouter = ({
  repo,
  optionalAuth,
}: {
  repo: Pick<AdminRepository, "recordClientError">;
  optionalAuth: RequestHandler;
}): Router => {
  const router = Router();

  router.post(
    "/",
    perMinute("client-errors", 10),
    optionalAuth,
    validate({ body: ClientErrorReportSchema }),
    async (req, res) => {
      const report = req.valid!.body as z.infer<typeof ClientErrorReportSchema>;
      await repo.recordClientError({
        message: report.message,
        stack: report.stack,
        path: report.path,
        build: report.build,
        user_agent: req.get("user-agent")?.slice(0, 300) ?? null,
        user_id: req.auth?.userId ?? null,
      });
      res.status(204).end();
    },
  );

  return router;
};
