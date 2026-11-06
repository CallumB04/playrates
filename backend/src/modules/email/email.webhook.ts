import { createHmac, timingSafeEqual } from "node:crypto";
import type { EmailMessageStatus } from "@playrates/shared";
import type { DeliveryEvent } from "./email.repository.js";

/** Svix's own tolerance, either side of now: an older delivery is a replay. */
const TOLERANCE_S = 5 * 60;

export interface SvixHeaders {
  id: string | undefined;
  timestamp: string | undefined;
  signature: string | undefined;
}

/**
 * Whether a webhook really came from Resend. Resend signs through Svix:
 * HMAC-SHA256 over `id.timestamp.body` with the base64 secret after its
 * `whsec_`, sent as space-separated `v1,<base64>` (several while a secret
 * is being rotated). The body must be the bytes as they arrived.
 */
export const verifySvixSignature = (
  secret: string,
  headers: SvixHeaders,
  body: Buffer | string,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean => {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature) return false;
  const at = Number(timestamp);
  if (!Number.isInteger(at) || Math.abs(nowSeconds - at) > TOLERANCE_S) {
    return false;
  }
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key)
    .update(`${id}.${timestamp}.`)
    .update(body)
    .digest();
  return signature.split(" ").some((entry) => {
    const [version, value] = entry.split(",");
    if (version !== "v1" || !value) return false;
    const given = Buffer.from(value, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
};

/** The parts of a Resend webhook acted on: a contact's, or an email's. */
export interface ContactEvent {
  type: string;
  data?: {
    email?: unknown;
    unsubscribed?: unknown;
    email_id?: unknown;
    broadcast_id?: unknown;
    to?: unknown;
    bounce?: { message?: unknown };
    suppressed?: { message?: unknown };
    failed?: { reason?: unknown };
  };
}

/** Resend's email events, as the log's statuses. `email.sent` is left out:
 *  the log says sent the moment Resend takes it. */
const DELIVERY_STATUS: Record<string, EmailMessageStatus> = {
  "email.delivery_delayed": "delayed",
  "email.delivered": "delivered",
  "email.bounced": "bounced",
  "email.suppressed": "suppressed",
  "email.failed": "failed",
  "email.complained": "complained",
};

const text = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

/** An email event, ready for the log; null for anything else. */
export const deliveryOf = (event: ContactEvent): DeliveryEvent | null => {
  const status = DELIVERY_STATUS[event.type];
  const resendId = text(event.data?.email_id);
  if (!status || !resendId) return null;
  const to = Array.isArray(event.data?.to) ? text(event.data.to[0]) : null;
  return {
    resendId,
    broadcastId: text(event.data?.broadcast_id),
    to,
    status,
    detail:
      text(event.data?.bounce?.message) ??
      text(event.data?.suppressed?.message) ??
      text(event.data?.failed?.reason),
  };
};
