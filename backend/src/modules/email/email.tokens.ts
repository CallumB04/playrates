import { createHmac, timingSafeEqual } from "node:crypto";
import { EMAIL_SCOPES, type EmailScope } from "@playrates/shared";

/**
 * The token every unsubscribe link carries: who and which switch, signed.
 * No expiry, since an email read a year later must still be stoppable, and
 * the worst a leaked one does is turn that one switch.
 */
export interface UnsubscribeClaim {
  userId: string;
  scope: EmailScope;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const sign = (secret: string, payload: string): Buffer =>
  createHmac("sha256", secret).update(payload).digest();

export const signUnsubscribeToken = (
  secret: string,
  { userId, scope }: UnsubscribeClaim,
): string => {
  const payload = `${userId}:${scope}`;
  return `${Buffer.from(payload).toString("base64url")}.${sign(secret, payload).toString("base64url")}`;
};

/** The claim, or null for anything not signed with this secret. */
export const readUnsubscribeToken = (
  secret: string,
  token: string,
): UnsubscribeClaim | null => {
  const [encoded, signature, ...rest] = token.split(".");
  if (!encoded || !signature || rest.length > 0) return null;
  const payload = Buffer.from(encoded, "base64url").toString("utf8");
  const expected = sign(secret, payload);
  const given = Buffer.from(signature, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return null;
  }
  const [userId = "", scope = ""] = payload.split(":");
  if (!UUID.test(userId)) return null;
  if (!(EMAIL_SCOPES as string[]).includes(scope)) return null;
  return { userId, scope: scope as EmailScope };
};
