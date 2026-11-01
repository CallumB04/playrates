import type { IncomingMessage, ServerResponse } from "node:http";
import { createServerApp } from "../backend/src/server.js";

/**
 * The scheduled jobs as a function of their own, so a long run (emails,
 * the trending refresh) has its own time limit and never shares an
 * instance with someone loading a page. Vercel calls /api/cron?job=name;
 * the API's cron router does the work, and still wants the cron secret.
 */
const { app } = createServerApp();

export default (req: IncomingMessage, res: ServerResponse) => {
  const job = new URL(req.url ?? "/", "http://cron").searchParams.get("job");
  req.url = `/api/v1/cron/${encodeURIComponent(job ?? "")}`;
  return app(req as never, res as never);
};
