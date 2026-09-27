import {
  ADMIN_PERIOD_FIELDS,
  ANNOUNCEMENT_TONES,
  activityGroupOf,
  firstHeading,
  gameEventGroupOf,
  patchNotePath,
  type AdminPatchNote,
  type RichTextDoc,
  type AdminActivityEvent,
  type AdminBucket,
  type AdminGameEvent,
  type AdminGameSummary,
  type AdminMetric,
  type AdminMetricDetail,
  type AdminOverview,
  type AdminPeriodFigure,
  type AdminRange,
  type AdminSeriesPoint,
  type AdminTotals,
  type AdminUserSummary,
  type Announcement,
  type AnnouncementTone,
  type RawgUsage,
  type ServerErrorEntry,
} from "@playrates/shared";
import type {
  AdminActivityFeedRow,
  AdminGameFeedRow,
  AdminSeriesRow,
  AdminUserDirectoryRow,
  AnnouncementCardRow,
  GameRow,
  RawgUsageDayRow,
} from "../../types/database.types.js";
import { isOnline, toAccent } from "../profiles/profiles.mapper.js";
import type { PatchNoteEntryRow, ServerErrorRowWithUser } from "./admin.repository.js";

const DAY_MS = 86_400_000;

/** YYYY-MM-DD, UTC. Every series on the dashboard is in UTC. */
export const isoDay = (date: Date): string => date.toISOString().slice(0, 10);

const addDays = (day: string, days: number): string =>
  isoDay(new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS));

/** The Monday of that day's week, as Postgres's date_trunc('week') has it. */
const weekStart = (day: string): string => {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
  return addDays(day, -((weekday + 6) % 7));
};

export interface RangeWindow {
  range: AdminRange;
  bucket: AdminBucket;
  /** First and last bucket of the current period, inclusive. */
  from: string;
  to: string;
  /** Where the equal-length period before it starts. */
  previousFrom: string;
}

const RANGE_DAYS: Record<Exclude<AdminRange, "12m">, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

/** A year reads better by week than as 365 bars. */
const WEEKS_IN_YEAR = 52;

export const rangeWindow = (range: AdminRange, today: Date): RangeWindow => {
  const to = isoDay(today);
  if (range === "12m") {
    const from = addDays(weekStart(to), -(WEEKS_IN_YEAR - 1) * 7);
    return {
      range,
      bucket: "week",
      from,
      to,
      previousFrom: addDays(from, -WEEKS_IN_YEAR * 7),
    };
  }
  const days = RANGE_DAYS[range];
  const from = addDays(to, -(days - 1));
  return { range, bucket: "day", from, to, previousFrom: addDays(from, -days) };
};

export const periodChange = (
  current: number,
  previous: number,
): AdminPeriodFigure => ({
  current,
  previous,
  change:
    previous === 0 ? (current === 0 ? 0 : null) : (current - previous) / previous,
});

const toPoint = (row: AdminSeriesRow): AdminSeriesPoint => ({
  bucket: row.bucket,
  signups: row.signups,
  logs: row.logs,
  reviews: row.reviews,
  threads: row.threads,
  messages: row.messages,
  active: row.active,
  activeWeek: row.active_week,
});

/**
 * `rows` spans both periods, oldest first; the current one is handed out as
 * the series, the previous one only as the sums it is compared against.
 */
export const toOverview = (
  window: RangeWindow,
  totals: AdminTotals,
  rows: AdminSeriesRow[],
): AdminOverview => {
  const points = rows.map(toPoint);
  const current = points.filter((p) => p.bucket >= window.from);
  const previous = points.filter((p) => p.bucket < window.from);

  const sum = (list: AdminSeriesPoint[], field: (typeof ADMIN_PERIOD_FIELDS)[number]) =>
    list.reduce((total, p) => total + p[field], 0);

  const period = Object.fromEntries(
    ADMIN_PERIOD_FIELDS.map((field) => [
      field,
      periodChange(sum(current, field), sum(previous, field)),
    ]),
  ) as AdminOverview["period"];

  // A week earlier is seven daily buckets back, or the one weekly bucket.
  const last = points.at(-1);
  const weekBack =
    window.bucket === "week"
      ? points.at(-2)
      : points.find((p) => last && p.bucket === addDays(last.bucket, -7));

  return {
    range: window.range,
    bucket: window.bucket,
    from: window.from,
    to: window.to,
    totals,
    period,
    activeWeek: periodChange(last?.activeWeek ?? 0, weekBack?.activeWeek ?? 0),
    series: current,
  };
};

type RawRanked = { accent?: string | null } & Record<string, unknown>;

/** The SQL already speaks camelCase; this only fixes the accent up and
 *  stamps which metric it is. */
export const toMetricDetail = (
  metric: AdminMetric,
  raw: Record<string, unknown>,
): AdminMetricDetail => {
  if (metric === "users") {
    const mostActive = (raw.mostActive as RawRanked[] | undefined) ?? [];
    return {
      ...(raw as object),
      metric,
      mostActive: mostActive.map((user) => ({
        ...user,
        accent: toAccent(user.accent ?? null),
      })),
    } as AdminMetricDetail;
  }
  return { ...(raw as object), metric } as AdminMetricDetail;
};

const EXCERPT_LIMIT = 280;

const str = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

export const toActivityEvent = (row: AdminActivityFeedRow): AdminActivityEvent => ({
  id: row.id,
  kind: row.kind,
  group: activityGroupOf(row.kind),
  createdAt: row.created_at,
  // The id outlives the account; only a live profile has a name to show.
  actor:
    row.actor_id && row.actor_username
      ? {
          id: row.actor_id,
          username: row.actor_username,
          avatarUrl: row.actor_avatar_url,
          accent: toAccent(row.actor_accent),
        }
      : null,
  game:
    row.game_id && row.game_title
      ? { id: row.game_id, title: row.game_title, coverUrl: row.game_cover_url }
      : null,
  subjectId: row.subject_id,
  subjectUsername: row.subject_username,
  excerpt:
    (row.message_excerpt ?? str(row.data.excerpt))?.slice(0, EXCERPT_LIMIT) ??
    null,
  data: row.data,
});

export const toGameEvent = (row: AdminGameFeedRow): AdminGameEvent => ({
  id: row.id,
  kind: row.kind,
  group: gameEventGroupOf(row.kind),
  source: row.source,
  createdAt: row.created_at,
  game:
    row.game_id && row.game_title
      ? {
          id: row.game_id,
          title: row.game_title,
          coverUrl: row.game_cover_url,
          isTrending: row.game_is_trending ?? false,
          rawgId: row.game_rawg_id,
        }
      : null,
  actorUsername: row.actor_username,
  data: row.data,
});

export const toGameSummary = (row: GameRow): AdminGameSummary => ({
  id: row.id,
  title: row.title,
  slug: row.slug,
  coverUrl: row.box_art_url ?? row.cover_url,
  rawgId: row.rawg_id,
  isTrending: row.is_trending,
  releaseDate: row.release_date,
  detailsSyncedAt: row.details_synced_at,
  logCount: row.log_count,
});

export const toUserSummary = (
  row: AdminUserDirectoryRow,
  now = Date.now(),
): AdminUserSummary => ({
  id: row.id,
  username: row.username,
  avatarUrl: row.avatar_url,
  accent: toAccent(row.accent),
  isAdmin: row.is_admin,
  createdAt: row.created_at,
  lastSeenAt: row.last_seen_at,
  onboardedAt: row.onboarded_at,
  // hide_online is for other users; the admin sees who is actually here
  online: isOnline(row.last_seen_at, now),
  logCount: Number(row.log_count),
  reviewCount: Number(row.review_count),
  messageCount: Number(row.message_count),
  friendCount: Number(row.friend_count),
  activeDayCount: Number(row.active_day_count),
});

/** How far back the usage chart looks. */
export const RAWG_USAGE_DAYS = 30;

export interface RawgAllowanceSetting {
  allowance: number;
  resetDay: number;
}

/** The last figure read off RAWG's dashboard, and how much of that day had
 *  already been counted when it was, so the day isn't counted twice. */
export interface RawgCorrection {
  left: number;
  day: string;
  baseline: number;
}

const dayNumber = (day: string) => Date.parse(`${day}T00:00:00Z`) / DAY_MS;

/** The reset day in a given month, pulled in for a month too short for it. */
const resetIn = (year: number, month: number, resetDay: number): string => {
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return isoDay(new Date(Date.UTC(year, month, Math.min(resetDay, last))));
};

/** The allowance period today falls in: from the last reset, up to (not
 *  including) the next. */
export const rawgPeriod = (
  today: Date,
  resetDay: number,
): { start: string; resetsOn: string } => {
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();
  const day = isoDay(today);
  const thisMonth = resetIn(y, m, resetDay);
  return day >= thisMonth
    ? { start: thisMonth, resetsOn: resetIn(y, m + 1, resetDay) }
    : { start: resetIn(y, m - 1, resetDay), resetsOn: thisMonth };
};

/** The first day the usage query has to reach: the period's start or the
 *  chart's, whichever is earlier. */
export const rawgUsageFrom = (today: Date, resetDay: number): string => {
  const { start } = rawgPeriod(today, resetDay);
  const chartStart = addDays(isoDay(today), -(RAWG_USAGE_DAYS - 1));
  return start < chartStart ? start : chartStart;
};

/** `rows` from `rawgUsageFrom(today)`, oldest first. */
export const toRawgUsage = (
  rows: RawgUsageDayRow[],
  today: Date,
  setting: RawgAllowanceSetting,
  correction: RawgCorrection | null,
): RawgUsage => {
  const day = isoDay(today);
  const { start, resetsOn } = rawgPeriod(today, setting.resetDay);
  const sumFrom = (from: string) =>
    rows.filter((r) => r.day >= from).reduce((n, r) => n + r.requests, 0);

  // A correction made this period is the best figure there is; one from an
  // earlier period was reset away with it.
  const corrected = correction !== null && correction.day >= start;
  const used = corrected
    ? setting.allowance - correction.left + (sumFrom(correction.day) - correction.baseline)
    : sumFrom(start);
  const left = Math.max(0, setting.allowance - used);

  const elapsed = dayNumber(day) - dayNumber(start) + 1;
  const daysLeft = Math.max(1, dayNumber(resetsOn) - dayNumber(day));
  const pace = Math.round(used / elapsed);
  const projectedLeft = left - pace * daysLeft;
  const runsOutOn =
    projectedLeft < 0 && pace > 0 ? addDays(day, Math.floor(left / pace)) : null;

  const byDay = new Map(rows.map((r) => [r.day, r]));
  const chartStart = addDays(day, -(RAWG_USAGE_DAYS - 1));
  const days = Array.from({ length: RAWG_USAGE_DAYS }, (_, i) => {
    const d = addDays(chartStart, i);
    const row = byDay.get(d);
    return { day: d, requests: row?.requests ?? 0, failures: row?.failures ?? 0 };
  });

  const latest = (pick: (r: RawgUsageDayRow) => string | null) =>
    rows.map(pick).filter((v): v is string => v !== null).sort().at(-1) ?? null;
  const lastFailure = [...rows]
    .filter((r) => r.last_failure_at)
    .sort((a, b) => (a.last_failure_at! < b.last_failure_at! ? -1 : 1))
    .at(-1);

  return {
    allowance: setting.allowance,
    periodStart: start,
    resetsOn,
    daysLeft,
    used,
    left,
    basis: corrected ? "corrected" : "counted",
    since: corrected ? correction.day : (rows.find((r) => r.requests > 0)?.day ?? null),
    dailyBudget: Math.floor(left / daysLeft),
    pace,
    projectedLeft,
    runsOutOn,
    periodFailures: rows.filter((r) => r.day >= start).reduce((n, r) => n + r.failures, 0),
    days,
    lastRequestAt: latest((r) => r.last_request_at),
    lastFailureAt: lastFailure?.last_failure_at ?? null,
    lastError: lastFailure?.last_error ?? null,
  };
};

const toTone = (tone: string): AnnouncementTone =>
  (ANNOUNCEMENT_TONES as readonly string[]).includes(tone)
    ? (tone as AnnouncementTone)
    : "info";

export const toAnnouncement = (row: AnnouncementCardRow): Announcement => ({
  id: row.id,
  tone: toTone(row.tone),
  title: row.title,
  body: row.body,
  link: row.link_path,
  createdAt: row.created_at,
  retractedAt: row.retracted_at,
  recipientCount: row.recipient_count,
  readCount: Number(row.read_count),
});

/** An entry is named by its first h1; failing that, by whatever heading
 *  comes first, since the editor lets a release be headed at any level. */
export const patchNoteTitle = (body: unknown): string | null => {
  const doc = body as RichTextDoc | null;
  if (!doc || !Array.isArray(doc.content)) return null;
  return firstHeading(doc, 1) ?? firstHeading(doc);
};

export const toPatchNote = (
  entry: PatchNoteEntryRow,
  announcement: AnnouncementCardRow | undefined,
): AdminPatchNote => ({
  messageId: entry.id,
  threadId: entry.thread_id,
  title: patchNoteTitle(entry.body),
  createdAt: entry.created_at,
  editedAt: entry.edited_at,
  link: patchNotePath(entry.thread_id, entry.id),
  announcement: announcement ? toAnnouncement(announcement) : null,
});

export const toServerError = (row: ServerErrorRowWithUser): ServerErrorEntry => ({
  id: row.id,
  status: row.status,
  code: row.code,
  method: row.method,
  path: row.path,
  message: row.message,
  requestId: row.request_id,
  userId: row.user_id,
  username: row.username,
  stack: row.stack,
  createdAt: row.created_at,
});

/** Pages fetched one past the limit: the extra row only says there is more. */
export const toCursorPage = <Row extends { id: number }, T>(
  rows: Row[],
  limit: number,
  map: (row: Row) => T,
): { data: T[]; nextBefore: number | null } => {
  const page = rows.slice(0, limit);
  return {
    data: page.map(map),
    nextBefore: rows.length > limit ? (page.at(-1)?.id ?? null) : null,
  };
};
