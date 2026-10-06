import { z } from "zod";
import { PaginationSchema } from "./common.js";
import type { ProfileAccent } from "./profileAccent.js";

// Ranges and overview ------------------------------------------------------------

export const ADMIN_RANGES = ["7d", "30d", "90d", "12m"] as const;
export type AdminRange = (typeof ADMIN_RANGES)[number];

export const AdminRangeQuerySchema = z.object({
  range: z.enum(ADMIN_RANGES).default("30d"),
});

export type AdminBucket = "day" | "week";

/** Things made per bucket, and who was around. */
export interface AdminSeriesPoint {
  /** YYYY-MM-DD, UTC. The Monday, for a weekly bucket. */
  bucket: string;
  signups: number;
  logs: number;
  reviews: number;
  threads: number;
  messages: number;
  /** Distinct people active within the bucket. */
  active: number;
  /** Distinct people active in the seven days ending on the bucket. */
  activeWeek: number;
}

export interface AdminTotals {
  users: number;
  onboarded: number;
  logs: number;
  reviews: number;
  threads: number;
  messages: number;
  games: number;
  friendships: number;
  online: number;
  dau: number;
  wau: number;
  mau: number;
}

export interface AdminPeriodFigure {
  current: number;
  previous: number;
  /** Fractional change on the previous period. Null when it grew from zero,
   *  which has no percentage. */
  change: number | null;
}

export const ADMIN_PERIOD_FIELDS = [
  "signups",
  "logs",
  "reviews",
  "threads",
  "messages",
] as const;
export type AdminPeriodField = (typeof ADMIN_PERIOD_FIELDS)[number];

export interface AdminOverview {
  range: AdminRange;
  bucket: AdminBucket;
  /** The current period's first and last bucket, inclusive. */
  from: string;
  to: string;
  totals: AdminTotals;
  period: Record<AdminPeriodField, AdminPeriodFigure>;
  /** Weekly active people now, against a week earlier. */
  activeWeek: AdminPeriodFigure;
  /** The current period only; the previous one is folded into `period`. */
  series: AdminSeriesPoint[];
}

export const ADMIN_METRICS = [
  "users",
  "logs",
  "reviews",
  "community",
  "games",
] as const;
export type AdminMetric = (typeof ADMIN_METRICS)[number];

export const AdminMetricParamSchema = z.object({
  metric: z.enum(ADMIN_METRICS),
});

export interface AdminRankedGame {
  id: number;
  title: string;
  coverUrl: string | null;
  count: number;
}

export interface AdminRankedUser {
  username: string;
  avatarUrl: string | null;
  accent: ProfileAccent;
  count: number;
}

export interface AdminUsersDetail {
  metric: "users";
  lastSeen: {
    online: number;
    today: number;
    week: number;
    month: number;
    total: number;
  };
  onboarded: number;
  mostActive: AdminRankedUser[];
}

export interface AdminLogsDetail {
  metric: "logs";
  byStatus: Record<string, number>;
  byPlayedStatus: Record<string, number>;
  /** 0–1, of every log. */
  ratedShare: number | null;
  averageRating: number | null;
  topGames: AdminRankedGame[];
}

export interface AdminReviewsDetail {
  metric: "reviews";
  public: number;
  private: number;
  spoilers: number;
  upvotes: number;
  topGames: AdminRankedGame[];
}

export interface AdminCommunityDetail {
  metric: "community";
  upvotes: number;
  replies: number;
  topThreads: { id: number; title: string; count: number }[];
}

export interface AdminGamesDetail {
  metric: "games";
  total: number;
  added: number;
  withCover: number;
  withBoxArt: number;
  withDescription: number;
  /** Games that came from IGDB, rather than from before it. */
  fromIgdb: number;
  trending: number;
  mostLogged: AdminRankedGame[];
}

export type AdminMetricDetail =
  | AdminUsersDetail
  | AdminLogsDetail
  | AdminReviewsDetail
  | AdminCommunityDetail
  | AdminGamesDetail;

// Feeds --------------------------------------------------------------------------

/** Newest first, paged by id: `before` is the last id of the previous page. */
export const CursorQuerySchema = z.object({
  before: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(40),
});

export interface CursorPage<T> {
  data: T[];
  /** Pass back as `before` for the next page. Null at the end. */
  nextBefore: number | null;
}

export const ACTIVITY_GROUPS = {
  account: ["signup", "profile_updated", "account_deleted"],
  logs: ["log_added", "log_updated", "log_removed"],
  reviews: ["review_posted", "review_edited", "review_removed", "review_upvoted"],
  community: [
    "thread_created",
    "thread_removed",
    "message_posted",
    "message_edited",
    "message_deleted",
    "message_upvoted",
  ],
  social: ["friend_requested", "friend_accepted", "friend_removed"],
} as const;

export type ActivityGroup = keyof typeof ACTIVITY_GROUPS;
export type ActivityKind = (typeof ACTIVITY_GROUPS)[ActivityGroup][number];

export const ACTIVITY_GROUP_NAMES = Object.keys(ACTIVITY_GROUPS) as [
  ActivityGroup,
  ...ActivityGroup[],
];

export const ACTIVITY_KINDS = Object.values(ACTIVITY_GROUPS).flat() as [
  ActivityKind,
  ...ActivityKind[],
];

export const activityGroupOf = (kind: string): ActivityGroup | null =>
  ACTIVITY_GROUP_NAMES.find((group) =>
    (ACTIVITY_GROUPS[group] as readonly string[]).includes(kind),
  ) ?? null;

export const AdminActivityQuerySchema = CursorQuerySchema.extend({
  group: z.enum(ACTIVITY_GROUP_NAMES).optional(),
  kind: z.enum(ACTIVITY_KINDS).optional(),
  userId: z.string().uuid().optional(),
});

export type AdminActivityQuery = z.infer<typeof AdminActivityQuerySchema>;

export interface AdminPerson {
  id: string;
  username: string;
  avatarUrl: string | null;
  accent: ProfileAccent;
}

export interface AdminGameRef {
  id: number;
  title: string;
  coverUrl: string | null;
}

export interface AdminActivityEvent {
  id: number;
  kind: string;
  group: ActivityGroup | null;
  createdAt: string;
  /** Null once the account is gone. */
  actor: AdminPerson | null;
  game: AdminGameRef | null;
  subjectId: string | null;
  /** The other person, for friendship events. */
  subjectUsername: string | null;
  /** A message's words as they stand now, or a review's opening. */
  excerpt: string | null;
  data: Record<string, unknown>;
}

// Users --------------------------------------------------------------------------

export const ADMIN_USER_SORTS = ["recent", "joined", "active"] as const;

export const AdminUsersQuerySchema = PaginationSchema.extend({
  q: z.string().trim().max(24).optional(),
  sort: z.enum(ADMIN_USER_SORTS).default("recent"),
});

export type AdminUsersQuery = z.infer<typeof AdminUsersQuerySchema>;

export const AdminUserIdParamSchema = z.object({
  id: z.string().uuid(),
});

export interface AdminUserDetail extends AdminUserSummary {
  /** Days they used PlayRates in the last twelve weeks, YYYY-MM-DD, UTC. */
  activeDays: string[];
}

export interface AdminUserSummary extends AdminPerson {
  isAdmin: boolean;
  createdAt: string;
  lastSeenAt: string;
  onboardedAt: string | null;
  online: boolean;
  logCount: number;
  reviewCount: number;
  messageCount: number;
  friendCount: number;
  /** Distinct days they have opened PlayRates, ever. Not days since joining. */
  activeDayCount: number;
}

// Games --------------------------------------------------------------------------

export const GAME_EVENT_GROUPS = {
  added: ["game_added", "igdb_import"],
  content: [
    "cover_updated",
    "box_art_updated",
    "description_pulled",
    "release_date_changed",
    "title_changed",
    "details_resynced",
  ],
  pulls: ["search_pull", "manual_pull"],
  failures: ["details_backfill_failed"],
  controls: ["trending_set", "trending_cleared"],
} as const;

export type GameEventGroup = keyof typeof GAME_EVENT_GROUPS;
export type GameEventKind = (typeof GAME_EVENT_GROUPS)[GameEventGroup][number];

export const GAME_EVENT_GROUP_NAMES = Object.keys(GAME_EVENT_GROUPS) as [
  GameEventGroup,
  ...GameEventGroup[],
];

export const gameEventGroupOf = (kind: string): GameEventGroup | null =>
  GAME_EVENT_GROUP_NAMES.find((group) =>
    (GAME_EVENT_GROUPS[group] as readonly string[]).includes(kind),
  ) ?? null;

export const GAME_EVENT_SOURCES = [
  "search",
  "page_view",
  "manual_pull",
  "import",
  "admin",
] as const;
export type GameEventSource = (typeof GAME_EVENT_SOURCES)[number];

export const AdminGameEventsQuerySchema = CursorQuerySchema.extend({
  group: z.enum(GAME_EVENT_GROUP_NAMES).optional(),
  gameId: z.coerce.number().int().positive().optional(),
});

export type AdminGameEventsQuery = z.infer<typeof AdminGameEventsQuerySchema>;

export interface AdminGameSummary extends AdminGameRef {
  slug: string;
  igdbId: number | null;
  isTrending: boolean;
  releaseDate: string | null;
  /** When IGDB's details were last written onto it. */
  syncedAt: string | null;
  logCount: number;
}

export interface AdminGameEvent {
  id: number;
  kind: string;
  group: GameEventGroup | null;
  source: string | null;
  createdAt: string;
  game: (AdminGameRef & { isTrending: boolean; igdbId: number | null }) | null;
  actorUsername: string | null;
  data: Record<string, unknown>;
}

export const AdminGameSearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(100),
});

export const AdminGameIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const AdminGamePatchSchema = z
  .object({ isTrending: z.boolean() })
  .strict();

/** IGDB has no allowance to spend, only a rate; this is for seeing that
 *  calls are getting through. */
export interface IgdbUsage {
  todayRequests: number;
  todayFailures: number;
  /** The last 30 days, oldest first, zero-filled. */
  days: { day: string; requests: number; failures: number }[];
  lastRequestAt: string | null;
  lastFailureAt: string | null;
  lastError: string | null;
}

export const PULL_WINDOWS = [7, 30, 90] as const;
export const PULL_MAX_PAGES = 5;
/** IGDB's page size ceiling, and what each pull page asks for. */
export const PULL_PAGE_SIZE = 500;

export const AdminPullSchema = z
  .object({
    windowDays: z.union([z.literal(7), z.literal(30), z.literal(90)]),
    includeUpcoming: z.boolean().default(false),
    maxPages: z.number().int().min(1).max(PULL_MAX_PAGES),
  })
  .strict();

export type AdminPullInput = z.infer<typeof AdminPullSchema>;

export interface AdminPullResult {
  /** Each page is one IGDB request, unless it had to be retried. */
  pages: number;
  fetched: number;
  added: number;
  updated: number;
  /** IGDB had more beyond the page cap. */
  hasMore: boolean;
}

export const AdminImportSchema = z
  .object({ igdbId: z.number().int().positive() })
  .strict();

export interface AdminImportResult {
  game: AdminGameSummary;
  created: boolean;
}

// Announcements ------------------------------------------------------------------

export const ANNOUNCEMENT_TONES = [
  "info",
  "update",
  "warning",
  "celebration",
] as const;
export type AnnouncementTone = (typeof ANNOUNCEMENT_TONES)[number];

/** What the bell's row holds without a third line; the composer counts
 *  against these, and the API holds to them. */
export const ANNOUNCEMENT_TITLE_MAX = 60;
export const ANNOUNCEMENT_BODY_MAX = 160;

/** In-app paths only. Protocol-relative ("//host") would leave the site. */
export const InAppPathSchema = z
  .string()
  .trim()
  .max(200)
  .regex(/^\/(?!\/)[^\s]*$/, "Must be a path on PlayRates, starting with /");

export const AnnouncementInputSchema = z
  .object({
    tone: z.enum(ANNOUNCEMENT_TONES),
    title: z.string().trim().min(1).max(ANNOUNCEMENT_TITLE_MAX),
    body: z.string().trim().min(1).max(ANNOUNCEMENT_BODY_MAX),
    link: InAppPathSchema.nullable().default(null),
  })
  .strict();

export type AnnouncementInput = z.infer<typeof AnnouncementInputSchema>;

export const AnnouncementIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export interface Announcement {
  id: number;
  tone: AnnouncementTone;
  title: string;
  body: string;
  link: string | null;
  createdAt: string;
  retractedAt: string | null;
  recipientCount: number;
  readCount: number;
}

export interface AnnouncementSendResult {
  announcement: Announcement;
}

// Patch notes ----------------------------------------------------------------

/** One entry in the patch notes, and whether everyone has been told of it. */
export interface AdminPatchNote {
  messageId: number;
  threadId: number;
  /** The entry's first h1, which names the release. Null when it has none. */
  title: string | null;
  createdAt: string;
  editedAt: string | null;
  /** The patch notes, scrolled to this entry. */
  link: string;
  /** The announcement that told everyone, while it stands. Taking it back
   *  leaves the entry free to go out again. */
  announcement: Announcement | null;
}

export const PatchNoteIdParamSchema = z.object({
  messageId: z.coerce.number().int().positive(),
});

export const patchNotePath = (threadId: number, messageId: number): string =>
  `/community/thread/${threadId}#message-${messageId}`;

const PATCH_NOTE_PREFIX = "New patch notes: ";

/** What everyone is sent for an entry: its title in the bell, and a tap
 *  that opens the notes at that entry. */
export const patchNoteAnnouncement = (
  title: string | null,
  link: string,
): AnnouncementInput => {
  const room = ANNOUNCEMENT_TITLE_MAX - PATCH_NOTE_PREFIX.length;
  const name = title?.trim();
  return {
    tone: "update",
    title: !name
      ? "New patch notes"
      : PATCH_NOTE_PREFIX +
        (name.length > room ? `${name.slice(0, room - 1).trimEnd()}\u2026` : name),
    body: "What\u2019s new and what\u2019s fixed in PlayRates. Open it to read the notes.",
    link,
  };
};

// Health -------------------------------------------------------------------------

export interface AdminHealth {
  checkedAt: string;
  api: {
    ok: true;
    /** How long this server instance has been up. On serverless, since
     *  its cold start. */
    uptimeSeconds: number;
    commit: string | null;
    region: string | null;
    node: string;
  };
  database: {
    ok: boolean;
    latencyMs: number | null;
    error: string | null;
  };
  igdb: {
    configured: boolean;
    todayRequests: number;
    todayFailures: number;
    lastRequestAt: string | null;
    lastFailureAt: string | null;
    lastError: string | null;
  };
  errors: {
    last24h: number;
    lastAt: string | null;
  };
}

export interface ServerErrorEntry {
  id: number;
  status: number;
  code: string;
  method: string;
  path: string;
  message: string;
  requestId: string | null;
  userId: string | null;
  username: string | null;
  stack: string | null;
  createdAt: string;
}
