import { describe, expect, it } from "vitest";
import {
  periodChange,
  rangeWindow,
  rawgUsageFrom,
  toActivityEvent,
  toCursorPage,
  toOverview,
  toRawgUsage,
} from "../../src/modules/admin/admin.mapper.js";
import type {
  AdminActivityFeedRow,
  AdminSeriesRow,
  RawgUsageDayRow,
} from "../../src/types/database.types.js";

// A Saturday.
const TODAY = new Date("2026-09-26T15:00:00Z");

const row = (bucket: string, fields: Partial<AdminSeriesRow> = {}): AdminSeriesRow => ({
  bucket,
  signups: 0,
  logs: 0,
  reviews: 0,
  threads: 0,
  messages: 0,
  active: 0,
  active_week: 0,
  ...fields,
});

const totals = {
  users: 0, onboarded: 0, logs: 0, reviews: 0, threads: 0, messages: 0,
  games: 0, friendships: 0, online: 0, dau: 0, wau: 0, mau: 0,
};

describe("rangeWindow", () => {
  it("covers the last seven days, today included, and the seven before", () => {
    expect(rangeWindow("7d", TODAY)).toEqual({
      range: "7d",
      bucket: "day",
      from: "2026-09-20",
      to: "2026-09-26",
      previousFrom: "2026-09-13",
    });
  });

  it("buckets a year by week, starting on a Monday like date_trunc", () => {
    const window = rangeWindow("12m", TODAY);
    expect(window.bucket).toBe("week");
    // 2026-09-21 is this week's Monday; 51 weeks before it
    expect(window.from).toBe("2025-09-29");
    expect(new Date(`${window.from}T00:00:00Z`).getUTCDay()).toBe(1);
    expect(window.previousFrom).toBe("2024-09-30");
  });
});

describe("periodChange", () => {
  it("is the fractional change on the period before", () => {
    expect(periodChange(15, 10).change).toBe(0.5);
    expect(periodChange(5, 10).change).toBe(-0.5);
  });

  it("has no percentage for growth from nothing", () => {
    expect(periodChange(4, 0).change).toBeNull();
  });

  it("calls nothing from nothing no change", () => {
    expect(periodChange(0, 0).change).toBe(0);
  });
});

describe("toOverview", () => {
  const window = rangeWindow("7d", TODAY);

  it("hands out the current period and compares its sums with the previous one", () => {
    const rows = [
      row("2026-09-13", { signups: 2 }),
      row("2026-09-19", { signups: 2, logs: 4 }),
      row("2026-09-20", { signups: 1, logs: 1 }),
      row("2026-09-26", { signups: 5, logs: 1 }),
    ];

    const overview = toOverview(window, totals, rows);

    expect(overview.series.map((p) => p.bucket)).toEqual(["2026-09-20", "2026-09-26"]);
    expect(overview.period.signups).toEqual({ current: 6, previous: 4, change: 0.5 });
    expect(overview.period.logs).toEqual({ current: 2, previous: 4, change: -0.5 });
  });

  it("compares weekly active people with seven days earlier", () => {
    const rows = [
      row("2026-09-19", { active_week: 8 }),
      row("2026-09-25", { active_week: 11 }),
      row("2026-09-26", { active_week: 12 }),
    ];

    expect(toOverview(window, totals, rows).activeWeek).toEqual({
      current: 12,
      previous: 8,
      change: 0.5,
    });
  });

  it("compares a weekly series with the week before", () => {
    const weekly = rangeWindow("12m", TODAY);
    const rows = [row("2026-09-14", { active_week: 10 }), row("2026-09-21", { active_week: 5 })];
    expect(toOverview(weekly, totals, rows).activeWeek.change).toBe(-0.5);
  });
});

describe("toRawgUsage", () => {
  const day = (d: string, requests: number, extra: Partial<RawgUsageDayRow> = {}) => ({
    day: d,
    requests,
    failures: 0,
    last_request_at: `${d}T12:00:00Z`,
    last_failure_at: null,
    last_error: null,
    ...extra,
  });

  it("reaches back to the month's start or thirty days, whichever is earlier", () => {
    expect(rawgUsageFrom(TODAY)).toBe("2026-08-28");
    expect(rawgUsageFrom(new Date("2026-09-30T00:00:00Z"))).toBe("2026-09-01");
  });

  it("totals this month only, and projects the month from its daily rate", () => {
    const usage = toRawgUsage(
      [day("2026-08-31", 900), day("2026-09-01", 100), day("2026-09-26", 420)],
      TODAY,
    );

    expect(usage.monthRequests).toBe(520);
    // 520 over 26 days is 20 a day, across 30
    expect(usage.projected).toBe(600);
    expect(usage.allowance).toBe(20_000);
  });

  it("gives thirty days of bars, zero-filled, ending today", () => {
    const usage = toRawgUsage([day("2026-09-26", 3)], TODAY);
    expect(usage.days).toHaveLength(30);
    expect(usage.days.at(-1)).toEqual({ day: "2026-09-26", requests: 3, failures: 0 });
    expect(usage.days[0]).toEqual({ day: "2026-08-28", requests: 0, failures: 0 });
  });

  it("surfaces the most recent failure", () => {
    const usage = toRawgUsage(
      [
        day("2026-09-20", 5, { failures: 1, last_failure_at: "2026-09-20T08:00:00Z", last_error: "RAWG responded 502" }),
        day("2026-09-26", 5, { failures: 1, last_failure_at: "2026-09-26T09:00:00Z", last_error: "RAWG responded 429" }),
      ],
      TODAY,
    );
    expect(usage.lastError).toBe("RAWG responded 429");
    expect(usage.monthFailures).toBe(2);
  });
});

describe("toActivityEvent", () => {
  const base: AdminActivityFeedRow = {
    id: 1,
    actor_id: "u1",
    kind: "review_posted",
    game_id: 7,
    subject_id: "12",
    data: { excerpt: "Loved it" },
    created_at: "2026-09-26T00:00:00Z",
    actor_username: "bee",
    actor_avatar_url: null,
    actor_accent: "not-a-colour",
    game_title: "Hades",
    game_cover_url: null,
    subject_username: null,
    message_excerpt: null,
  };

  it("groups the kind and falls back to a real accent", () => {
    const event = toActivityEvent(base);
    expect(event.group).toBe("reviews");
    expect(event.actor?.accent).toBe("indigo");
    expect(event.excerpt).toBe("Loved it");
  });

  it("shows no actor once the account is gone, though the id is kept", () => {
    const event = toActivityEvent({ ...base, actor_username: null });
    expect(event.actor).toBeNull();
  });

  it("prefers a message's current words to anything stored with the event", () => {
    const event = toActivityEvent({ ...base, message_excerpt: "Edited since" });
    expect(event.excerpt).toBe("Edited since");
  });
});

describe("toCursorPage", () => {
  it("uses the extra row only to say there is more", () => {
    const rows = [{ id: 9 }, { id: 8 }, { id: 7 }];
    expect(toCursorPage(rows, 2, (r) => r.id)).toEqual({ data: [9, 8], nextBefore: 8 });
    expect(toCursorPage(rows, 3, (r) => r.id)).toEqual({ data: [9, 8, 7], nextBefore: null });
  });
});
