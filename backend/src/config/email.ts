import type { Env } from "./env.js";
import type { Logger } from "../lib/logger.js";
import { afterResponse, type Defer } from "../lib/afterResponse.js";
import {
  createResendActivity,
  type SendActivity,
} from "../modules/email/email.activity.js";
import {
  createResendAudience,
  type NewsAudience,
} from "../modules/email/email.audience.js";
import { createResendClient } from "../modules/email/email.resend.js";
import {
  createLoggingSender,
  createMailpitSender,
  createResendSender,
  type EmailSender,
} from "../modules/email/email.sender.js";
import type { EmailSettings } from "../modules/email/email.service.js";

/** Everything the email service needs from outside: where to send, the
 *  news audience, and how to run work after the response. */
export interface EmailDeps {
  sender: EmailSender;
  audience: NewsAudience | null;
  activity: SendActivity | null;
  settings: EmailSettings;
  defer: Defer;
}

type EmailEnv = Pick<
  Env,
  | "RESEND_API_KEY"
  | "RESEND_SEGMENT_ID"
  | "RESEND_WEBHOOK_SECRET"
  | "EMAIL_SIGNING_SECRET"
  | "EMAIL_FROM"
  | "SITE_URL"
  | "PUBLIC_API_URL"
  | "MAILPIT_URL"
>;

export const emailSettingsFrom = (config: EmailEnv): EmailSettings => ({
  site: config.SITE_URL,
  api: config.PUBLIC_API_URL ?? `${config.SITE_URL}/api/v1`,
  signingSecret: config.EMAIL_SIGNING_SECRET,
  webhookSecret: config.RESEND_WEBHOOK_SECRET,
});

/** Resend with a key; the local mail viewer with MAILPIT_URL; otherwise
 *  only a log line, as IGDB falls back to the local catalogue. */
export const emailFromEnv = (
  config: EmailEnv,
  logger: Logger,
  fetchImpl: typeof fetch = fetch,
): EmailDeps => {
  const settings = emailSettingsFrom(config);
  const defer: Defer = (work) =>
    afterResponse(work, (error) =>
      logger.error({ err: error }, "email: work after the response failed"),
    );

  if (config.RESEND_API_KEY) {
    const client = createResendClient(config.RESEND_API_KEY, fetchImpl);
    return {
      sender: createResendSender(client, config.EMAIL_FROM),
      audience: config.RESEND_SEGMENT_ID
        ? createResendAudience(client, config.RESEND_SEGMENT_ID, config.EMAIL_FROM)
        : null,
      activity: createResendActivity(client),
      settings,
      defer,
    };
  }
  return {
    sender: config.MAILPIT_URL
      ? createMailpitSender(config.MAILPIT_URL, config.EMAIL_FROM, fetchImpl)
      : createLoggingSender(logger),
    audience: null,
    activity: null,
    settings,
    defer,
  };
};
