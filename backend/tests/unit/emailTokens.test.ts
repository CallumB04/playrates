import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  readUnsubscribeToken,
  signUnsubscribeToken,
} from "../../src/modules/email/email.tokens.js";
import { verifySvixSignature } from "../../src/modules/email/email.webhook.js";

const SECRET = "a-signing-secret";
const USER = "11111111-1111-1111-1111-111111111111";

describe("unsubscribe tokens", () => {
  it("reads back who and which switch", () => {
    const token = signUnsubscribeToken(SECRET, { userId: USER, scope: "replies" });
    expect(readUnsubscribeToken(SECRET, token)).toEqual({
      userId: USER,
      scope: "replies",
    });
  });

  it("covers every email with the all scope", () => {
    const token = signUnsubscribeToken(SECRET, { userId: USER, scope: "all" });
    expect(readUnsubscribeToken(SECRET, token)?.scope).toBe("all");
  });

  it("is safe in a URL as it is", () => {
    const token = signUnsubscribeToken(SECRET, { userId: USER, scope: "news" });
    expect(encodeURIComponent(token)).toBe(token);
  });

  it("refuses one signed with another secret", () => {
    const token = signUnsubscribeToken("someone-elses", { userId: USER, scope: "news" });
    expect(readUnsubscribeToken(SECRET, token)).toBeNull();
  });

  it("refuses one whose switch has been swapped", () => {
    const token = signUnsubscribeToken(SECRET, { userId: USER, scope: "news" });
    const [, signature] = token.split(".");
    const swapped = `${Buffer.from(`${USER}:all`).toString("base64url")}.${signature}`;
    expect(readUnsubscribeToken(SECRET, swapped)).toBeNull();
  });

  it("refuses a well-signed claim for a switch that doesn't exist", () => {
    const payload = `${USER}:everything`;
    const signature = createHmac("sha256", SECRET).update(payload).digest("base64url");
    const token = `${Buffer.from(payload).toString("base64url")}.${signature}`;
    expect(readUnsubscribeToken(SECRET, token)).toBeNull();
  });

  it("refuses something that isn't a token at all", () => {
    expect(readUnsubscribeToken(SECRET, "nonsense")).toBeNull();
    expect(readUnsubscribeToken(SECRET, "a.b.c")).toBeNull();
  });
});

describe("Svix webhook signatures", () => {
  const key = Buffer.from("webhook-key");
  const secret = `whsec_${key.toString("base64")}`;
  const body = Buffer.from('{"type":"contact.updated"}');
  const now = 1_800_000_000;
  const sign = (id: string, at: number, payload: Buffer) =>
    createHmac("sha256", key).update(`${id}.${at}.`).update(payload).digest("base64");

  it("accepts Resend's own", () => {
    const signature = `v1,${sign("msg_1", now, body)}`;
    expect(
      verifySvixSignature(secret, { id: "msg_1", timestamp: String(now), signature }, body, now),
    ).toBe(true);
  });

  it("accepts any one of several, as during a rotation", () => {
    const signature = `v1,bm90IGl0 v1,${sign("msg_1", now, body)}`;
    expect(
      verifySvixSignature(secret, { id: "msg_1", timestamp: String(now), signature }, body, now),
    ).toBe(true);
  });

  it("refuses a body changed after signing", () => {
    const signature = `v1,${sign("msg_1", now, body)}`;
    expect(
      verifySvixSignature(
        secret,
        { id: "msg_1", timestamp: String(now), signature },
        Buffer.from('{"type":"contact.deleted"}'),
        now,
      ),
    ).toBe(false);
  });

  it("refuses a replay from long ago", () => {
    const old = now - 600;
    const signature = `v1,${sign("msg_1", old, body)}`;
    expect(
      verifySvixSignature(secret, { id: "msg_1", timestamp: String(old), signature }, body, now),
    ).toBe(false);
  });

  it("refuses a delivery without the headers", () => {
    expect(
      verifySvixSignature(secret, { id: undefined, timestamp: undefined, signature: undefined }, body, now),
    ).toBe(false);
  });
});
