import { Router, type RequestHandler } from "express";
import type { z } from "zod";
import { PushEndpointSchema, PushSubscriptionSchema } from "@playrates/shared";
import { AppError } from "../../lib/AppError.js";
import { validate } from "../../middleware/validate.js";
import type { PushService } from "./push.service.js";

const callerId = (req: { auth?: { userId: string } }): string => {
  const id = req.auth?.userId;
  if (!id) throw AppError.unauthorized();
  return id;
};

/** Mounted at /push: the key a browser subscribes with. Null when push
 *  isn't set up, so the app doesn't offer it. */
export const createPushRouter = ({
  service,
}: {
  service: PushService;
}): Router => {
  const router = Router();
  router.get("/key", (_req, res) => {
    res.json({ publicKey: service.publicKey() });
  });
  return router;
};

/** Mounted at /me/push: this browser, on or off. */
export const createMyPushRouter = ({
  service,
  requireAuth,
}: {
  service: PushService;
  requireAuth: RequestHandler;
}): Router => {
  const router = Router();
  router.use(requireAuth);

  router.post(
    "/",
    validate({ body: PushSubscriptionSchema }),
    async (req, res) => {
      if (!service.publicKey()) throw AppError.notFound("Push");
      const { endpoint, keys } = req.valid!.body as z.infer<
        typeof PushSubscriptionSchema
      >;
      await service.subscribe(
        callerId(req),
        { endpoint, p256dh: keys.p256dh, auth: keys.auth },
        req.get("user-agent")?.slice(0, 300) ?? null,
      );
      res.status(204).end();
    },
  );

  // A POST, not a DELETE with a body: the endpoint is a secret of sorts,
  // and a body is where it stays out of logs.
  router.post(
    "/remove",
    validate({ body: PushEndpointSchema }),
    async (req, res) => {
      const { endpoint } = req.valid!.body as z.infer<
        typeof PushEndpointSchema
      >;
      await service.unsubscribe(callerId(req), endpoint);
      res.status(204).end();
    },
  );

  return router;
};
