import type { AppNotification, FriendRelation } from "@playrates/shared";
import { toFriendUser } from "../friends/friends.mapper.js";
import type { NotificationRowWithActor } from "./notifications.repository.js";

/** One pending request between a pair, so the pair identifies it. */
export const friendRequestKey = (actorId: string): string =>
  `friend_request:${actorId}`;

/** Unfriending and befriending again resurfaces the one row. */
export const friendAcceptedKey = (actorId: string): string =>
  `friend_accepted:${actorId}`;

/** Resolves the caller's current relationship with an actor. Supplied by the
 *  service so the mapper stays pure. */
export type RelationLookup = (actorId: string) => FriendRelation | null;

/**
 * Rows are snake_case and kind-agnostic; the API hands out a discriminated
 * union. A kind this build doesn't know maps to `unknown` rather than
 * throwing — a client one deploy behind should show a plain row, not a 500.
 */
export const toNotification = (
  row: NotificationRowWithActor,
  relationOf: RelationLookup,
  now = Date.now(),
): AppNotification => {
  const base = {
    id: row.id,
    createdAt: row.created_at,
    readAt: row.read_at,
    archivedAt: row.archived_at,
  };

  switch (row.kind) {
    case "welcome":
      return { ...base, kind: "welcome" };

    case "friend_request":
      // The actor cascades away with their profile, so a row without one is
      // a friend request from nobody. Nothing to render, nothing to act on.
      if (!row.actor) return { ...base, kind: "unknown" };
      return {
        ...base,
        kind: "friend_request",
        actor: toFriendUser(row.actor, now),
        relation: relationOf(row.actor.id),
      };

    case "friend_accepted":
      if (!row.actor) return { ...base, kind: "unknown" };
      return {
        ...base,
        kind: "friend_accepted",
        actor: toFriendUser(row.actor, now),
      };

    default:
      return { ...base, kind: "unknown" };
  }
};
