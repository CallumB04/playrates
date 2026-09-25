import { z } from "zod";
import {
  BooleanQuerySchema,
  PaginationSchema,
  type Paginated,
} from "./common.js";
import type { FriendRelation, FriendUser } from "./friend.js";

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

/** Someone answered one of your messages directly, with Reply on it. */
export interface CommunityReplyNotification extends NotificationBase {
  kind: "community_reply";
  actor: FriendUser;
  threadId: number;
  threadTitle: string;
  /** The reply, so the link can land on it. */
  messageId: number;
  /** The start of the reply, as plain text. */
  excerpt: string;
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
}

/** A community message of yours reached an upvote milestone. */
export interface CommunityUpvoteMilestoneNotification extends NotificationBase {
  kind: "community_upvote_milestone";
  threadId: number;
  threadTitle: string;
  messageId: number;
  excerpt: string;
  milestone: number;
}

/** A review of yours reached an upvote milestone. */
export interface ReviewUpvoteMilestoneNotification extends NotificationBase {
  kind: "review_upvote_milestone";
  reviewId: number;
  gameId: number;
  gameTitle: string;
  coverUrl: string | null;
  milestone: number;
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

/** The count is of everything unread, not of the page — a badge that only
 *  counted the first page would stop climbing at 25. */
export interface NotificationFeed extends Paginated<AppNotification> {
  unread: number;
}
