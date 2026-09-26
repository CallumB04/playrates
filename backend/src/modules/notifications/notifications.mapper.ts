import type { AppNotification, FriendRelation } from "@playrates/shared";
import { toFriendUser } from "../friends/friends.mapper.js";
import type { NotificationRowWithActor } from "./notifications.repository.js";

/** One pending request between a pair, so the pair identifies it. */
export const friendRequestKey = (actorId: string): string =>
  `friend_request:${actorId}`;

/** Unfriending and befriending again resurfaces the one row. */
export const friendAcceptedKey = (actorId: string): string =>
  `friend_accepted:${actorId}`;

/** One activity notification per thread per person. */
export const communityThreadKey = (threadId: number): string =>
  `community_thread:${threadId}`;

/** One per reply, so deleting the reply can take its notification too. */
export const communityReplyKey = (messageId: number): string =>
  `community_reply:${messageId}`;

/** One per message or review, raised again in place at each milestone. */
export const communityUpvotesKey = (messageId: number): string =>
  `community_upvotes:${messageId}`;
export const reviewUpvotesKey = (reviewId: number): string =>
  `review_upvotes:${reviewId}`;

const num = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
const str = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

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

    case "community_reply": {
      const threadId = num(row.data.threadId);
      const messageId = num(row.data.messageId);
      const threadTitle = str(row.data.threadTitle);
      if (
        !row.actor ||
        threadId === null ||
        messageId === null ||
        !threadTitle
      ) {
        return { ...base, kind: "unknown" };
      }
      return {
        ...base,
        kind: "community_reply",
        actor: toFriendUser(row.actor, now),
        threadId,
        threadTitle,
        messageId,
        excerpt: str(row.data.excerpt) ?? "",
      };
    }

    case "community_thread_activity": {
      const threadId = num(row.data.threadId);
      const threadTitle = str(row.data.threadTitle);
      if (threadId === null || !threadTitle) {
        return { ...base, kind: "unknown" };
      }
      return {
        ...base,
        kind: "community_thread_activity",
        threadId,
        threadTitle,
        gameTitle: str(row.data.gameTitle),
        coverUrl: str(row.data.coverUrl),
        count: Math.max(1, num(row.data.count) ?? 1),
      };
    }

    case "community_upvote_milestone": {
      const threadId = num(row.data.threadId);
      const messageId = num(row.data.messageId);
      const milestone = num(row.data.milestone);
      const threadTitle = str(row.data.threadTitle);
      if (
        threadId === null ||
        messageId === null ||
        milestone === null ||
        !threadTitle
      ) {
        return { ...base, kind: "unknown" };
      }
      return {
        ...base,
        kind: "community_upvote_milestone",
        threadId,
        threadTitle,
        messageId,
        excerpt: str(row.data.excerpt) ?? "",
        milestone,
      };
    }

    case "review_upvote_milestone": {
      const reviewId = num(row.data.reviewId);
      const gameId = num(row.data.gameId);
      const milestone = num(row.data.milestone);
      const gameTitle = str(row.data.gameTitle);
      if (
        reviewId === null ||
        gameId === null ||
        milestone === null ||
        !gameTitle
      ) {
        return { ...base, kind: "unknown" };
      }
      return {
        ...base,
        kind: "review_upvote_milestone",
        reviewId,
        gameId,
        gameTitle,
        coverUrl: str(row.data.coverUrl),
        milestone,
      };
    }

    default:
      return { ...base, kind: "unknown" };
  }
};
