import type { EmailDay, EmailStats } from "@playrates/shared";
import type { EmailSendTotalRow } from "../../types/database.types.js";
import type { RecentSends } from "./email.activity.js";

export const EMAIL_STATS_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const isoDay = (at: number) => new Date(at).toISOString().slice(0, 10);

/** The first moment of the 30-day chart, a UTC midnight. */
export const emailStatsStart = (now: Date): string =>
  `${isoDay(now.getTime() - (EMAIL_STATS_DAYS - 1) * DAY_MS)}T00:00:00.000Z`;

/**
 * The admin's figures, from the log's totals by day (`days`) and since
 * 24 hours ago (`window`), and what Resend says it sent.
 */
export const toEmailStats = ({
  days,
  window,
  resend,
  newsSubscribers,
  now,
}: {
  days: EmailSendTotalRow[];
  window: EmailSendTotalRow[];
  resend: RecentSends | null;
  newsSubscribers: number;
  now: Date;
}): EmailStats => {
  const own = (rows: EmailSendTotalRow[]) => rows.filter((r) => r.transactional);

  const last24h = { sent: 0, capped: 0, failed: 0 };
  for (const row of own(window)) last24h[row.status] += row.recipients;

  const byDay = new Map<string, EmailDay>();
  const chart = Array.from({ length: EMAIL_STATS_DAYS }, (_, i) => {
    const day = isoDay(now.getTime() - (EMAIL_STATS_DAYS - 1 - i) * DAY_MS);
    const entry = { day, sent: 0, capped: 0, failed: 0 };
    byDay.set(day, entry);
    return entry;
  });
  const kinds = new Map<string, number>();
  for (const row of own(days)) {
    const entry = byDay.get(row.day);
    if (entry) entry[row.status] += row.recipients;
    if (row.status === "sent") {
      kinds.set(row.kind, (kinds.get(row.kind) ?? 0) + row.recipients);
    }
  }

  const broadcasts = { count: 0, recipients: 0 };
  for (const row of days) {
    if (row.transactional || row.status !== "sent") continue;
    broadcasts.count += row.sends;
    broadcasts.recipients += row.recipients;
  }

  return {
    last24h,
    resend: resend ? { ...resend } : null,
    days: chart,
    kinds: [...kinds]
      .map(([kind, sent]) => ({ kind, sent }))
      .sort((a, b) => b.sent - a.sent || a.kind.localeCompare(b.kind)),
    broadcasts,
    newsSubscribers,
  };
};
