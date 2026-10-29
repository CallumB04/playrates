import type { Logger } from "../../lib/logger.js";
import type { ResendClient } from "./email.resend.js";

/** One email, ready to go. */
export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
}

export interface EmailSender {
  readonly name: "resend" | "mailpit" | "log";
  /** Every message, in as few requests as the provider allows. Throws if
   *  any request fails; what went before it has gone. */
  send(messages: EmailMessage[]): Promise<void>;
}

/** The most Resend takes in one batch request. */
export const RESEND_BATCH_MAX = 100;

export const createResendSender = (
  client: ResendClient,
  from: string,
): EmailSender => {
  const toResend = (m: EmailMessage) => ({
    from,
    to: [m.to],
    subject: m.subject,
    html: m.html,
    text: m.text,
    ...(m.headers ? { headers: m.headers } : {}),
  });
  return {
    name: "resend",
    async send(messages) {
      if (messages.length === 1) {
        await client.request("POST", "/emails", toResend(messages[0]!));
        return;
      }
      for (let i = 0; i < messages.length; i += RESEND_BATCH_MAX) {
        await client.request(
          "POST",
          "/emails/batch",
          messages.slice(i, i + RESEND_BATCH_MAX).map(toResend),
        );
      }
    },
  };
};

/** "PlayRates <hello@playrates.app>" as its two halves. */
export const parseAddress = (
  address: string,
): { Name: string; Email: string } => {
  const match = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(address);
  return match
    ? { Name: match[1]!.replace(/^"|"$/g, ""), Email: match[2]! }
    : { Name: "", Email: address.trim() };
};

/** The local stack's mail viewer, through its send API, so every email can
 *  be read there as it would arrive. */
export const createMailpitSender = (
  baseUrl: string,
  from: string,
  fetchImpl: typeof fetch = fetch,
): EmailSender => ({
  name: "mailpit",
  async send(messages) {
    for (const m of messages) {
      const response = await fetchImpl(
        `${baseUrl.replace(/\/+$/, "")}/api/v1/send`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            From: parseAddress(from),
            To: [{ Email: m.to }],
            Subject: m.subject,
            HTML: m.html,
            Text: m.text,
            Headers: m.headers ?? {},
          }),
          signal: AbortSignal.timeout(5_000),
        },
      );
      if (!response.ok) {
        throw new Error(
          `Mailpit refused the email (${response.status}): ${await response.text()}`,
        );
      }
    }
  },
});

/** Nowhere to send to: says what would have gone, and nothing more. */
export const createLoggingSender = (logger: Logger): EmailSender => ({
  name: "log",
  async send(messages) {
    for (const m of messages) {
      logger.info({ subject: m.subject }, "email not sent: no provider set");
    }
  },
});
