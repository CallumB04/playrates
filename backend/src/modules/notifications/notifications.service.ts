import {
  notificationGroupKey,
  relationFor,
  type FriendRelation,
  type NotificationBulkPatch,
  type NotificationFeed,
  type NotificationPatch,
  type Pagination,
} from "@playrates/shared";
import { AppError } from "../../lib/AppError.js";
import { toRange } from "../../lib/pagination.js";
import type { FriendsRepository } from "../friends/friends.repository.js";
import { toNotification, type RelationLookup } from "./notifications.mapper.js";
import type { NotificationsRepository } from "./notifications.repository.js";

/** A patch as columns. Filing something reads it; an explicit `read`
 *  still wins. */
const fieldsOf = (patch: NotificationPatch) => {
  const now = new Date().toISOString();
  const fields: { read_at?: string | null; archived_at?: string | null } = {};
  if (patch.archived !== undefined) {
    fields.archived_at = patch.archived ? now : null;
    if (patch.archived) fields.read_at = now;
  }
  if (patch.read !== undefined) fields.read_at = patch.read ? now : null;
  return fields;
};

/** The date in their own time zone; UTC's where theirs isn't one. */
const dayIn = (iso: string, timezone: string | null): string => {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone ?? "UTC",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
};

export const createNotificationsService = (
  repo: NotificationsRepository,
  friends: FriendsRepository,
) => {
  /** Friendships are read once per page rather than once per row, and only
   *  when something on the page actually depends on them. */
  const relationLookup = async (
    viewerId: string,
    needed: boolean,
  ): Promise<RelationLookup> => {
    if (!needed) return () => null;

    const rows = await friends.listForUser(viewerId);
    const byOther = new Map<string, FriendRelation>(
      rows.map((row) => [
        row.user_a_id === viewerId ? row.user_b_id : row.user_a_id,
        relationFor(row.status, row.requested_by, viewerId),
      ]),
    );
    return (actorId) => byOther.get(actorId) ?? null;
  };

  /** Whose friend requests to the caller are still waiting on an answer:
   *  those stay unread, and out of every bulk action, until answered. */
  const awaitingFrom = async (userId: string): Promise<string[]> => {
    const relationOf = await relationLookup(userId, true);
    const actors = await repo.unreadRequestActors(userId);
    return actors.filter((id) => relationOf(id) === "request-received");
  };

  /** Everything the caller owns; a notification is never visible to anyone
   *  else, so ownership is the whole authorization story here. */
  const ownedOrThrow = async (id: number, callerId: string) => {
    const row = await repo.findById(id);
    if (!row || row.user_id !== callerId) throw AppError.notFound("Notification");
    return row;
  };

  return {
    async listForUser(
      userId: string,
      { archived, ...pagination }: Pagination & { archived: boolean },
    ): Promise<NotificationFeed> {
      const { from, to } = toRange(pagination);
      const [{ rows, total }, unread, requestActors, owner, unreadRows] =
        await Promise.all([
          repo.listForUser(userId, archived, from, to),
          repo.countUnread(userId),
          repo.unreadRequestActors(userId),
          repo.bellOwner(userId),
          repo.unreadForRows(userId),
        ]);
      const { seenAt, timezone } = owner;

      const relationOf = await relationLookup(
        userId,
        requestActors.length > 0 ||
          rows.some((row) => row.kind === "friend_request"),
      );

      return {
        data: rows.map((row) => toNotification(row, relationOf)),
        meta: { page: pagination.page, limit: pagination.limit, total },
        unread,
        unseen: await repo.countUnseen(userId, seenAt),
        seenAt,
        unreadRows: new Set(
          unreadRows.map((n) =>
            notificationGroupKey(
              { id: n.id, kind: n.kind, threadId: n.thread_id },
              dayIn(n.created_at, timezone),
            ),
          ),
        ).size,
        awaitingAnswer: requestActors.filter(
          (id) => relationOf(id) === "request-received",
        ).length,
      };
    },

    async patch(id: number, callerId: string, patch: NotificationPatch) {
      const owned = await ownedOrThrow(id, callerId);

      if (owned.kind === "friend_request" && owned.actor_id) {
        const relationOf = await relationLookup(callerId, true);
        if (relationOf(owned.actor_id) === "request-received") {
          throw new AppError(
            409,
            "request_unanswered",
            "Answer the friend request first",
          );
        }
      }

      const row = await repo.update(id, fieldsOf(patch));

      const relationOf = await relationLookup(
        callerId,
        row.kind === "friend_request",
      );
      return toNotification(row, relationOf);
    },

    /** One change to many of the caller's at once. A request waiting on
     *  an answer is left as it is, as it is by the single patch. */
    async patchMany(
      userId: string,
      { ids, ...patch }: NotificationBulkPatch,
    ): Promise<void> {
      await repo.updateMany(userId, ids, fieldsOf(patch), await awaitingFrom(userId));
    },

    /** The bell was opened: what's in it now is no longer new. */
    async markSeen(userId: string): Promise<void> {
      await repo.markSeen(userId);
    },

    async markAllRead(userId: string, ids?: number[]): Promise<void> {
      if (ids?.length === 0) return;
      await repo.markAllRead(userId, await awaitingFrom(userId), ids);
    },

    async archiveAllRead(userId: string): Promise<void> {
      await repo.archiveAllRead(userId, await awaitingFrom(userId));
    },
  };
};

export type NotificationsService = ReturnType<
  typeof createNotificationsService
>;
