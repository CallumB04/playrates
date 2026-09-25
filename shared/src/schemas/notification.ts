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
] as const;

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
