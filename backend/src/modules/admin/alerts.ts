import type { Logger } from "../../lib/logger.js";
import type { EmailSender } from "../email/email.sender.js";
import type { EmailRepository } from "../email/email.repository.js";
import { alertEmail } from "../email/email.templates.js";
import type { AdminRepository } from "./admin.repository.js";

export type ErrorKind = "server" | "client";

/** A part of a scheduled job that threw, and what it threw. */
export interface JobFailure {
  part: string;
  error: unknown;
}

/** Tells the admins, by email, about trouble nobody would otherwise see
 *  until they next opened Health. Never throws: it runs where something
 *  has already gone wrong. */
export interface Alerts {
  jobFailed(job: string, failures: JobFailure[]): Promise<void>;
  /** After an error is kept: says so, once, when they are coming fast. */
  errorRecorded(kind: ErrorKind): Promise<void>;
}

const HOUR_MS = 3_600_000;

/* In an hour. A broken deploy shows as a crash on every page view, so
   browsers get more room than the API, whose 5xx are rarer. */
export const SPIKE_AT: Record<ErrorKind, number> = { server: 10, client: 25 };
// Once an alert has gone, the next waits this long: one email per incident.
const QUIET_MS = 6 * HOUR_MS;
// Counting on every error would double the load while errors pour in.
const CHECK_EVERY_MS = 60_000;

export const JOB_NAMES: Record<string, string> = {
  trending: "The morning job",
  nudges: "The evening job",
};

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const createAlerts = ({
  admin,
  emails,
  sender,
  site,
  logger,
  now = () => Date.now(),
}: {
  admin: Pick<
    AdminRepository,
    "adminIds" | "errorCount" | "getSetting" | "setSetting"
  >;
  emails: Pick<EmailRepository, "memberEmails">;
  sender: EmailSender;
  site: string;
  logger: Logger;
  now?: () => number;
}): Alerts => {
  const lastChecked: Record<ErrorKind, number> = { server: 0, client: 0 };

  const send = async (
    content: Parameters<typeof alertEmail>[0],
  ): Promise<void> => {
    const ids = await admin.adminIds();
    if (ids.length === 0) return;
    const rendered = alertEmail(content, site);
    const recipients = await emails.memberEmails(ids);
    await sender.send(
      recipients.map(({ email }) => ({ to: email, ...rendered })),
    );
  };

  return {
    async jobFailed(job, failures) {
      if (failures.length === 0) return;
      try {
        await send({
          kind: "job",
          job: JOB_NAMES[job] ?? job,
          failures: failures.map((f) => ({
            part: f.part,
            message: messageOf(f.error),
          })),
        });
      } catch (error) {
        logger.error({ err: error, job }, "alerts: job failure email failed");
      }
    },

    async errorRecorded(kind) {
      const at = now();
      if (at - lastChecked[kind] < CHECK_EVERY_MS) return;
      lastChecked[kind] = at;
      try {
        const count = await admin.errorCount(
          kind,
          new Date(at - HOUR_MS).toISOString(),
        );
        if (count < SPIKE_AT[kind]) return;

        // Shared across instances, so a spike seen by several sends once.
        const key = `alert:spike:${kind}`;
        const last = await admin.getSetting<string>(key);
        if (last && at - Date.parse(last) < QUIET_MS) return;
        await admin.setSetting(key, new Date(at).toISOString());

        await send({ kind: "spike", errors: kind, count });
      } catch (error) {
        logger.error({ err: error, kind }, "alerts: spike check failed");
      }
    },
  };
};

export const noopAlerts: Alerts = {
  async jobFailed() {},
  async errorRecorded() {},
};
