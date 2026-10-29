import express, { Router } from "express";
import { ResubscribeSchema, UnsubscribeTokenSchema } from "@playrates/shared";
import { z } from "zod";
import { perMinute } from "../../lib/rateLimit.js";
import { validate } from "../../middleware/validate.js";
import { AppError } from "../../lib/AppError.js";
import type { EmailService } from "./email.service.js";

/* A mail app's one-click unsubscribe posts a form (RFC 8058), not JSON. */
const formBody = express.urlencoded({ extended: false, limit: "4kb" });

/** The undo, for the token's own switch or, after "Turn off all emails",
 *  for all of them. */
const ResubscribeBody = ResubscribeSchema.extend({
  scope: z.literal("all").optional(),
}).strict();

/**
 * Mounted at /email, open to anyone: an unsubscribe link has to work from
 * a mail app with nobody signed in. The signed token is the only key.
 */
export const createEmailRouter = ({
  service,
}: {
  service: EmailService;
}): Router => {
  const router = Router();
  const limiter = perMinute(30);

  router.get(
    "/unsubscribe/:token",
    limiter,
    validate({ params: UnsubscribeTokenSchema }),
    async (req, res) => {
      const { token } = req.valid!.params as { token: string };
      res.json(await service.unsubscribeStatus(token));
    },
  );

  // The token rides in the query, where the List-Unsubscribe header puts
  // it; the page's own POST may send it in the body instead.
  // `scope: "all"` widens it to every email, for the page's "Turn off all
  // emails"; nothing narrower can be asked for than the token's own.
  router.post("/unsubscribe", limiter, formBody, async (req, res) => {
    const body = (req.body ?? {}) as { token?: unknown; scope?: unknown };
    const parsed = UnsubscribeTokenSchema.safeParse({
      token: typeof req.query.t === "string" ? req.query.t : body.token,
    });
    if (!parsed.success) throw AppError.badRequest("That unsubscribe link isn't valid");
    const scope = req.query.scope ?? body.scope;
    if (scope !== undefined && scope !== "all") {
      throw AppError.badRequest("Only all emails can be turned off this way");
    }
    res.json(await service.setByToken(parsed.data.token, false, scope));
  });

  router.post(
    "/resubscribe",
    limiter,
    validate({ body: ResubscribeBody }),
    async (req, res) => {
      const { token, scope } = req.valid!.body as z.infer<typeof ResubscribeBody>;
      res.json(await service.setByToken(token, true, scope));
    },
  );

  // The raw bytes were kept for this route in app.ts: the signature is
  // over the body exactly as it arrived.
  router.post("/webhooks/resend", async (req, res) => {
    const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    const ok = await service.handleWebhook(
      {
        id: req.header("svix-id"),
        timestamp: req.header("svix-timestamp"),
        signature: req.header("svix-signature"),
      },
      body,
    );
    if (!ok) throw AppError.unauthorized("Invalid webhook signature");
    res.status(204).end();
  });

  return router;
};
