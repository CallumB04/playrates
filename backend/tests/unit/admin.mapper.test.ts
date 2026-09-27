import { describe, expect, it } from "vitest";
import {
  periodChange,
  rangeWindow,
  rawgPeriod,
  rawgUsageFrom,
  toActivityEvent,
  toAnnouncement,
  toCursorPage,
  toGameEvent,
  toGameSummary,
  toMetricDetail,
  toOverview,
  toRawgUsage,
  toServerError,
  toUserSummary,
  patchNoteTitle,
  toPatchNote,
} from "../../src/modules/admin/admin.mapper.js";
import {
  ANNOUNCEMENT_TITLE_MAX,
  AnnouncementInputSchema,
  patchNoteAnnouncement,
} from "@playrates/shared";
import { buildGame } from "../helpers/fixtures.js";
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

describe("rawgPeriod", () => {
  it("runs from the 8th to the 8th, not the calendar month", () => {
    expect(rawgPeriod(TODAY, 8)).toEqual({ start: "2026-09-08", resetsOn: "2026-10-08" });
    expect(rawgPeriod(new Date("2026-10-03T00:00:00Z"), 8)).toEqual({
      start: "2026-09-08",
      resetsOn: "2026-10-08",
    });
  });

  it("starts a new period on the reset day itself", () => {
    expect(rawgPeriod(new Date("2026-10-08T00:30:00Z"), 8).start).toBe("2026-10-08");
  });

  it("pulls a reset day in for a month too short for it", () => {
    expect(rawgPeriod(new Date("2027-02-15T00:00:00Z"), 31)).toEqual({
      start: "2027-01-31",
      resetsOn: "2027-02-28",
    });
  });
});

describe("toRawgUsage", () => {
  const setting = { allowance: 20_000, resetDay: 8 };
  const day = (d: string, requests: number, extra: Partial<RawgUsageDayRow> = {}) => ({
    day: d,
    requests,
    failures: 0,
    last_request_at: `${d}T12:00:00Z`,
    last_failure_at: null,
    last_error: null,
    ...extra,
  });

  it("reaches back to the period's start or thirty days, whichever is earlier", () => {
    expect(rawgUsageFrom(TODAY, 8)).toBe("2026-08-28");
    expect(rawgUsageFrom(new Date("2026-11-07T00:00:00Z"), 8)).toBe("2026-10-08");
  });

  it("counts only this period when there is nothing to go on but its own count", () => {
    const usage = toRawgUsage([day("2026-09-07", 900), day("2026-09-20", 100)], TODAY, setting, null);
    expect(usage).toMatchObject({ basis: "counted", used: 100, left: 19_900, since: "2026-09-07" });
  });

  it("counts on from RAWG's own figure, without counting that day twice", () => {
    // Corrected on the 26th with 20 requests already counted that day; 30
    // more have come since.
    const usage = toRawgUsage(
      [day("2026-09-20", 500), day("2026-09-26", 50)],
      TODAY,
      setting,
      { left: 6_555, day: "2026-09-26", baseline: 20 },
    );
    expect(usage).toMatchObject({ basis: "corrected", left: 6_525, used: 13_475, since: "2026-09-26" });
  });

  it("forgets a correction from an earlier period, since the reset cleared it", () => {
    const usage = toRawgUsage([day("2026-09-20", 10)], TODAY, setting, {
      left: 100,
      day: "2026-09-01",
      baseline: 0,
    });
    expect(usage).toMatchObject({ basis: "counted", left: 19_990 });
  });

  it("spreads what is left over the days to the reset, and says when it runs out", () => {
    // 19 days in, 13,475 spent: 709 a day, against 6,525 over 12 days.
    const usage = toRawgUsage([day("2026-09-26", 30)], TODAY, setting, {
      left: 6_525,
      day: "2026-09-26",
      baseline: 30,
    });
    expect(usage.daysLeft).toBe(12);
    expect(usage.dailyBudget).toBe(543);
    expect(usage.pace).toBe(709);
    expect(usage.projectedLeft).toBeLessThan(0);
    expect(usage.runsOutOn).toBe("2026-10-05");
  });

  it("gives thirty days of bars, zero-filled, ending today", () => {
    const usage = toRawgUsage([day("2026-09-26", 3)], TODAY, setting, null);
    expect(usage.days).toHaveLength(30);
    expect(usage.days.at(-1)).toEqual({ day: "2026-09-26", requests: 3, failures: 0 });
    expect(usage.days[0]).toEqual({ day: "2026-08-28", requests: 0, failures: 0 });
  });

  it("surfaces the most recent failure, and counts this period's", () => {
    const usage = toRawgUsage(
      [
        day("2026-09-20", 5, { failures: 1, last_failure_at: "2026-09-20T08:00:00Z", last_error: "RAWG responded 502" }),
        day("2026-09-26", 5, { failures: 1, last_failure_at: "2026-09-26T09:00:00Z", last_error: "RAWG responded 429" }),
      ],
      TODAY,
      setting,
      null,
    );
    expect(usage.lastError).toBe("RAWG responded 429");
    expect(usage.periodFailures).toBe(2);
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

describe("toMetricDetail", () => {
  it("stamps the metric, and gives every ranked person a real accent", () => {
    const detail = toMetricDetail("users", {
      lastSeen: { online: 1, today: 1, week: 2, month: 2, total: 3 },
      onboarded: 2,
      mostActive: [{ username: "bee", avatarUrl: null, accent: null, count: 4 }],
    });
    expect(detail.metric).toBe("users");
    expect(detail.metric === "users" && detail.mostActive[0]!.accent).toBe("indigo");
  });

  it("passes the other metrics through as the SQL shaped them", () => {
    expect(toMetricDetail("reviews", { public: 2, private: 1 })).toMatchObject({
      metric: "reviews",
      public: 2,
    });
  });
});

describe("toGameEvent", () => {
  const row = {
    id: 3,
    kind: "cover_updated",
    game_id: 1,
    source: null,
    actor_id: null,
    data: { hadOne: false },
    created_at: "2026-09-26T00:00:00Z",
    game_title: "Hades",
    game_slug: "hades",
    game_cover_url: null,
    game_is_trending: null,
    game_rawg_id: 7,
    actor_username: null,
  };

  it("groups the kind and embeds the game", () => {
    expect(toGameEvent(row)).toMatchObject({
      group: "content",
      game: { id: 1, title: "Hades", isTrending: false, rawgId: 7 },
    });
  });

  it("has no game once it is gone", () => {
    expect(toGameEvent({ ...row, game_title: null }).game).toBeNull();
  });
});

describe("toGameSummary", () => {
  it("prefers the portrait box art to the landscape cover", () => {
    const summary = toGameSummary(
      buildGame({ box_art_url: "https://example.test/box.jpg" }),
    );
    expect(summary.coverUrl).toBe("https://example.test/box.jpg");
  });
});

describe("toUserSummary", () => {
  it("counts as numbers, and shows the admin who is really online", () => {
    const now = Date.parse("2026-09-26T12:00:00Z");
    const summary = toUserSummary(
      {
        id: "u1",
        username: "bee",
        avatar_url: null,
        accent: "rose",
        is_admin: false,
        created_at: "2026-01-01T00:00:00Z",
        last_seen_at: "2026-09-26T11:58:00Z",
        onboarded_at: null,
        log_count: "4" as unknown as number,
        review_count: 1,
        message_count: 0,
        friend_count: 2,
        active_day_count: 9,
      },
      now,
    );
    expect(summary).toMatchObject({ online: true, logCount: 4, activeDayCount: 9 });
  });
});

describe("toAnnouncement", () => {
  it("falls back to info for a tone this build does not know", () => {
    const announcement = toAnnouncement({
      id: 1,
      tone: "shouting",
      title: "Hi",
      body: "There",
      link_path: "/community",
      sent_by: null,
      recipient_count: 3,
      created_at: "2026-09-26T00:00:00Z",
      retracted_at: null,
      patch_note_message_id: null,
      read_count: 1,
    });
    expect(announcement).toMatchObject({ tone: "info", link: "/community", readCount: 1 });
  });
});

const heading = (level: 1 | 2 | 3, text: string) => ({
  type: "heading",
  attrs: { level },
  content: [{ type: "text", text }],
});
const para = (text: string) => ({ type: "paragraph", content: [{ type: "text", text }] });

describe("patchNoteTitle", () => {
  it("is the first h1, even under a smaller heading", () => {
    const body = { type: "doc", content: [heading(2, "Fixes"), para("…"), heading(1, "v1.2 Lists")] };
    expect(patchNoteTitle(body)).toBe("v1.2 Lists");
  });

  it("falls back to the first heading, then to nothing", () => {
    expect(patchNoteTitle({ type: "doc", content: [heading(2, "v1.1"), para("x")] })).toBe("v1.1");
    expect(patchNoteTitle({ type: "doc", content: [para("no heading")] })).toBeNull();
    expect(patchNoteTitle(null)).toBeNull();
  });
});

describe("toPatchNote", () => {
  it("links to the entry in the thread, and says whether it has gone out", () => {
    const entry = {
      id: 41,
      thread_id: 1,
      body: { type: "doc", content: [heading(1, "v1.2")] },
      created_at: "2026-09-27T09:00:00Z",
      edited_at: null,
    };
    expect(toPatchNote(entry, undefined)).toMatchObject({
      messageId: 41,
      title: "v1.2",
      link: "/community/thread/1#message-41",
      announcement: null,
    });
  });
});

describe("patchNoteAnnouncement", () => {
  it("names the release in the title and opens the notes at it", () => {
    expect(patchNoteAnnouncement("v1.2 Lists", "/community/thread/1#message-41")).toEqual({
      tone: "update",
      title: "New patch notes: v1.2 Lists",
      body: expect.any(String),
      link: "/community/thread/1#message-41",
    });
  });

  it("keeps a long title inside the bell's limit, and does without one", () => {
    const long = patchNoteAnnouncement("x".repeat(80), "/p");
    expect(long.title.length).toBeLessThanOrEqual(ANNOUNCEMENT_TITLE_MAX);
    expect(long.title.endsWith("\u2026")).toBe(true);
    expect(patchNoteAnnouncement(null, "/p").title).toBe("New patch notes");
    expect(AnnouncementInputSchema.safeParse(long).success).toBe(true);
  });
});

describe("toServerError", () => {
  it("keeps the request id and who was signed in", () => {
    expect(
      toServerError({
        id: 1,
        status: 500,
        code: "internal_error",
        method: "GET",
        path: "/api/v1/games",
        message: "boom",
        request_id: "req-1",
        user_id: "u1",
        username: "bee",
        stack: null,
        created_at: "2026-09-26T00:00:00Z",
      }),
    ).toMatchObject({ requestId: "req-1", username: "bee" });
  });
});
