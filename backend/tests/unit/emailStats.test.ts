import { describe, expect, it } from "vitest";
import {
  EMAIL_STATS_DAYS,
  emailStatsStart,
  toEmailStats,
} from "../../src/modules/email/email.stats.js";
import type { EmailSendTotalRow } from "../../src/types/database.types.js";

const NOW = new Date("2026-11-10T12:00:00Z");

const row = (overrides: Partial<EmailSendTotalRow>): EmailSendTotalRow => ({
  day: "2026-11-10",
  kind: "friend_request",
  status: "sent",
  transactional: true,
  sends: 1,
  recipients: 1,
  ...overrides,
});

const stats = (days: EmailSendTotalRow[], window: EmailSendTotalRow[] = []) =>
  toEmailStats({ days, window, resend: null, newsSubscribers: 0, now: NOW });

describe("toEmailStats", () => {
  it("starts the chart at midnight 29 days back", () => {
    expect(emailStatsStart(NOW)).toBe("2026-10-12T00:00:00.000Z");
  });

  it("fills every day of the chart, oldest first", () => {
    const { days } = stats([row({ day: "2026-11-09", recipients: 3 })]);
    expect(days).toHaveLength(EMAIL_STATS_DAYS);
    expect(days[0]!.day).toBe("2026-10-12");
    expect(days.at(-1)).toEqual({ day: "2026-11-10", sent: 0, capped: 0, failed: 0 });
    expect(days.at(-2)).toEqual({ day: "2026-11-09", sent: 3, capped: 0, failed: 0 });
  });

  it("splits the last 24 hours by outcome", () => {
    const { last24h } = stats(
      [],
      [
        row({ recipients: 5 }),
        row({ kind: "welcome", recipients: 2 }),
        row({ status: "capped", recipients: 4 }),
        row({ status: "failed", recipients: 1 }),
      ],
    );
    expect(last24h).toEqual({ sent: 7, capped: 4, failed: 1 });
  });

  it("ranks the kinds that went, and keeps broadcasts apart", () => {
    const result = stats([
      row({ kind: "welcome", recipients: 2 }),
      row({ kind: "friend_request", recipients: 5 }),
      row({ kind: "friend_request", day: "2026-11-01", recipients: 1 }),
      row({ kind: "friend_request", status: "capped", recipients: 9 }),
      row({ kind: "announcement", transactional: false, sends: 2, recipients: 300 }),
    ]);
    expect(result.kinds).toEqual([
      { kind: "friend_request", sent: 6 },
      { kind: "welcome", sent: 2 },
    ]);
    expect(result.broadcasts).toEqual({ count: 2, recipients: 300 });
    expect(result.days.at(-1)!.sent).toBe(7);
  });
});
