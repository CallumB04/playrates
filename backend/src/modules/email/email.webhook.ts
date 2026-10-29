import { createHmac, timingSafeEqual } from "node:crypto";

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

/** The one part of a Resend webhook acted on. */
export interface ContactEvent {
  type: string;
  data?: { email?: unknown; unsubscribed?: unknown };
}
