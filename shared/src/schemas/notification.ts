import { z } from "zod";
import {
  BooleanQuerySchema,
  PaginationSchema,
  type Paginated,
} from "./common.js";
import type { FriendRelation, FriendUser } from "./friend.js";
import type { AnnouncementTone } from "./admin.js";

/** Every kind the API will hand out. A client that doesn't know one renders
 *  its fallback rather than breaking, so this can grow ahead of the UI. */
export const NOTIFICATION_KINDS = [
  "welcome",
  "friend_request",
  "friend_accepted",
  "community_reply",
  "community_thread_activity",
  "community_upvote_milestone",
  "review_upvote_milestone",
  "list_upvote_milestone",
  "gaming_25_love_milestone",
  "referral_joined",
  "referral_active",
  "gift_received",
  "streak_at_risk",
  "task_nearly_done",
  "announcement",
] as const;

/** The upvote counts that are worth telling someone about. */
export const UPVOTE_MILESTONES = [5, 10, 20, 50, 100, 250] as const;

/** Votes arrive one at a time, so every milestone is passed exactly. */
export const isUpvoteMilestone = (count: number): boolean =>
  (UPVOTE_MILESTONES as readonly number[]).includes(count);

export const NotificationKindSchema = z.enum(NOTIFICATION_KINDS);
export type NotificationKind = z.infer<typeof NotificationKindSchema>;

/** What every notification carries, whatever it is about. */
interface NotificationBase {
  id: number;
  createdAt: string;
  readAt: string | null;
  archivedAt: string | null;
}

export interface WelcomeNotification extends NotificationBase {
  kind: "welcome";
}

export interface FriendRequestNotification extends NotificationBase {
  kind: "friend_request";
  actor: FriendUser;
  /** Read from the friendship on every fetch rather than copied at send
   *  time, so a request accepted or withdrawn elsewhere never leaves the
   *  inbox offering an Accept button that would 404. Null once it is gone. */
  relation: FriendRelation | null;
}

/** Your request was accepted — the other half of friend_request, for the
 *  person who sent it. */
export interface FriendAcceptedNotification extends NotificationBase {
  kind: "friend_accepted";
  actor: FriendUser;
}

/** Why a reply reached you: it answered you, it's in your thread, or it's
 *  in a conversation you're part of (a message and its replies). */
export const REPLY_REASONS = ["reply", "thread", "conversation"] as const;
export type ReplyReason = (typeof REPLY_REASONS)[number];

/** A stored reason, or "reply" for one raised before there were others. */
export const replyReasonOf = (value: unknown): ReplyReason =>
  REPLY_REASONS.includes(value as ReplyReason)
    ? (value as ReplyReason)
    : "reply";

/** Someone posted where you'll want to know: an answer to you, your
 *  thread, or a conversation you're in. */
export interface CommunityReplyNotification extends NotificationBase {
  kind: "community_reply";
  /** Absent from rows raised before there was more than one. */
  reason?: ReplyReason;
  actor: FriendUser;
  threadId: number;
  threadTitle: string;
  /** The reply, so the link can land on it. */
  messageId: number;
  /** The start of the reply, as plain text. */
  excerpt: string;
  /** About an adult game, for someone who hasn't chosen to see them:
   *  still there, with its titles and words left out. */
  hidden?: boolean;
}

/** New messages in a thread you started. One per thread: it counts up while
 *  unread, and the next message after reading it starts again at one. */
export interface CommunityThreadActivityNotification extends NotificationBase {
  kind: "community_thread_activity";
  threadId: number;
  threadTitle: string;
  gameTitle: string | null;
  coverUrl: string | null;
  count: number;
  hidden?: boolean;
}

/** A community message of yours reached an upvote milestone. */
export interface CommunityUpvoteMilestoneNotification extends NotificationBase {
  kind: "community_upvote_milestone";
  threadId: number;
  threadTitle: string;
  messageId: number;
  excerpt: string;
  milestone: number;
  hidden?: boolean;
}

/** A review of yours reached an upvote milestone. */
export interface ReviewUpvoteMilestoneNotification extends NotificationBase {
  kind: "review_upvote_milestone";
  reviewId: number;
  gameId: number;
  gameTitle: string;
  coverUrl: string | null;
  milestone: number;
  hidden?: boolean;
}

/** A list of yours reached an upvote milestone. */
export interface ListUpvoteMilestoneNotification extends NotificationBase {
  kind: "list_upvote_milestone";
  listId: number;
  listName: string;
  /** The list's page lives under its owner, who is the one told. */
  username: string;
  milestone: number;
}

/** Your Gaming 25 reached a love milestone. It lives under your own
 *  profile, so nothing else is needed to link to it. */
export interface Gaming25LoveMilestoneNotification extends NotificationBase {
  kind: "gaming_25_love_milestone";
  username: string;
  milestone: number;
}

/** Someone you invited signed up and said so. */
export interface ReferralJoinedNotification extends NotificationBase {
  kind: "referral_joined";
  username: string;
}

/** Someone you invited played enough games to count, and paid you for it. */
export interface ReferralActiveNotification extends NotificationBase {
  kind: "referral_active";
  /** Who it was, while they still have an account. */
  actor: FriendUser | null;
  username: string;
  xp: number;
  tokens: number;
}

/** Nothing done yet this week, late in the week, with a streak to lose. */
export interface StreakAtRiskNotification extends NotificationBase {
  kind: "streak_at_risk";
  weeks: number;
  /** A shield would keep the streak if the week stays empty. */
  shield: boolean;
  /** When the week ends, in the member's own time zone. */
  endsAt: string;
}

/** A task most of the way done, with its period about to end. */
export interface TaskNearlyDoneNotification extends NotificationBase {
  kind: "task_nearly_done";
  period: "week" | "month";
  /** The quest's key. */
  quest: string;
  label: string;
  count: number;
  target: number;
  xp: number;
  tokens: number;
  endsAt: string;
}

/** A friend bought you something from the shop. */
export interface GiftReceivedNotification extends NotificationBase {
  kind: "gift_received";
  /** Who sent it, while they still have an account. */
  actor: FriendUser | null;
  username: string;
  /** The shop item's key. */
  item: string;
}

/** A message from PlayRates to everyone, sent from the admin dashboard. */
export interface AnnouncementNotification extends NotificationBase {
  kind: "announcement";
  tone: AnnouncementTone;
  title: string;
  body: string;
  /** An in-app path, never another site. */
  link: string | null;
  /** Sent only to the admin, to see it in the bell before everyone does. */
  isTest: boolean;
}

/** A kind added to the API before this client knew about it. Kept in the
 *  union so exhaustive switches have to handle the case. */
export interface UnknownNotification extends NotificationBase {
  kind: "unknown";
}

/** `Notification` is a DOM global — the prefix keeps the two apart. */
export type AppNotification =
  | WelcomeNotification
  | FriendRequestNotification
  | FriendAcceptedNotification
  | CommunityReplyNotification
  | CommunityThreadActivityNotification
  | CommunityUpvoteMilestoneNotification
  | ReviewUpvoteMilestoneNotification
  | ListUpvoteMilestoneNotification
  | Gaming25LoveMilestoneNotification
  | ReferralJoinedNotification
  | ReferralActiveNotification
  | GiftReceivedNotification
  | StreakAtRiskNotification
  | TaskNearlyDoneNotification
  | AnnouncementNotification
  | UnknownNotification;

export const NotificationQuerySchema = PaginationSchema.extend({
  /** The archive is a separate list, not a filter over the same one. */
  archived: BooleanQuerySchema.default(false),
});

export const NotificationIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

/** Read and archived are independent, and either can be turned back off. */
export const NotificationPatchSchema = z
  .object({
    read: z.boolean().optional(),
    archived: z.boolean().optional(),
  })
  .strict()
  .refine((patch) => patch.read !== undefined || patch.archived !== undefined, {
    message: "Supply read, archived, or both",
  });

export type NotificationPatch = z.infer<typeof NotificationPatchSchema>;

/** The same change to many at once: a group cleared, Clear all, and the
 *  Undo that puts them back. */
export const NotificationBulkPatchSchema = z
  .object({
    ids: z.array(z.number().int().positive()).min(1).max(100),
    read: z.boolean().optional(),
    archived: z.boolean().optional(),
  })
  .strict()
  .refine((patch) => patch.read !== undefined || patch.archived !== undefined, {
    message: "Supply read, archived, or both",
  });

export type NotificationBulkPatch = z.infer<typeof NotificationBulkPatchSchema>;

/** Read-all, or only these: closing the bell reads what it showed, less
 *  any marked unread while it was open. No body at all, from a client
 *  older than it, reads everything. */
export const NotificationReadAllSchema = z
  .object({
    ids: z.array(z.number().int().positive()).max(100).optional(),
  })
  .strict()
  .optional();

export type NotificationReadAll = z.infer<typeof NotificationReadAllSchema>;

/** The count is of everything unread, not of the page — a badge that only
 *  counted the first page would stop climbing at 25. */
export interface NotificationFeed extends Paginated<AppNotification> {
  unread: number;
  /** Unread and raised since the bell was last opened: what the badge
   *  counts, so opening it clears it. Absent from an API older than it. */
  unseen?: number;
  /** When the bell was last opened, to tell what's new in the list. */
  seenAt?: string | null;
  /** Unread as the bell shows them, a group sharing a row counting once:
   *  what the badge says. Absent from an API older than it. */
  unreadRows?: number;
  /** Of those, friend requests still waiting on an answer: unread until
   *  answered, so the bulk actions leave them be. */
  awaitingAnswer: number;
}

/**
 * Which row of the bell a notification sits in. People doing the same
 * thing on the same day read as one line: friends accepting, or replies in
 * one thread. Everything else stands alone. `day` is the date in the
 * member's own time zone, so the bell and its badge agree on what a day is.
 */
export const notificationGroupKey = (
  n: {
    id: number;
    kind: string;
    threadId?: number | null;
    reason?: string | null;
  },
  day: string,
): string => {
  switch (n.kind) {
    case "friend_accepted":
      return `accepted:${day}`;
    case "community_reply":
      // Grouped only with the same reason, as each words it differently.
      return `reply:${n.threadId}:${n.reason ?? "reply"}:${day}`;
    default:
      return `one:${n.id}`;
  }
};

/**
 * A friend request still waiting on an answer is a task, not news: it cannot
 * be read or filed away, and stays unread until accepted or declined.
 */
export const awaitingAnswer = (notification: AppNotification): boolean =>
  notification.kind === "friend_request" &&
  notification.relation === "request-received";

/** A browser's push subscription, as PushSubscription.toJSON() gives it. */
export const PushSubscriptionSchema = z.object({
  endpoint: z.string().url().startsWith("https://").max(1000),
  keys: z.object({
    p256dh: z.string().min(1).max(200),
    auth: z.string().min(1).max(100),
  }),
});
export type PushSubscriptionInput = z.infer<typeof PushSubscriptionSchema>;

export const PushEndpointSchema = z.object({
  endpoint: z.string().url().max(1000),
});
