import {
  ANNOUNCEMENT_TONES,
  type AnnouncementTone,
  type AppNotification,
  type FriendRelation,
} from "@playrates/shared";
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
/** The migration's game_list_clear_notifications matches this form. */
export const listUpvotesKey = (listId: number): string =>
  `list_upvotes:${listId}`;
/** One per grid, which is one per person. */
export const gaming25LovesKey = (ownerId: string): string =>
  `gaming_25_loves:${ownerId}`;

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

    case "list_upvote_milestone": {
      const listId = num(row.data.listId);
      const milestone = num(row.data.milestone);
      const listName = str(row.data.listName);
      const username = str(row.data.username);
      if (listId === null || milestone === null || !listName || !username) {
        return { ...base, kind: "unknown" };
      }
      return {
        ...base,
        kind: "list_upvote_milestone",
        listId,
        listName,
        username,
        milestone,
      };
    }

    case "referral_joined": {
      const username = str(row.data.username);
      if (!username) return { ...base, kind: "unknown" };
      return { ...base, kind: "referral_joined", username };
    }

    case "gift_received": {
      const username = str(row.data.username);
      const item = str(row.data.item);
      if (!username || !item) return { ...base, kind: "unknown" };
      return { ...base, kind: "gift_received", username, item };
    }

    case "gaming_25_love_milestone": {
      const milestone = num(row.data.milestone);
      const username = str(row.data.username);
      if (milestone === null || !username) {
        return { ...base, kind: "unknown" };
      }
      return { ...base, kind: "gaming_25_love_milestone", username, milestone };
    }

    case "announcement": {
      const title = str(row.data.title);
      const body = str(row.data.body);
      if (!title || !body) return { ...base, kind: "unknown" };
      const tone = str(row.data.tone);
      return {
        ...base,
        kind: "announcement",
        tone: (ANNOUNCEMENT_TONES as readonly string[]).includes(tone ?? "")
          ? (tone as AnnouncementTone)
          : "info",
        title,
        body,
        link: str(row.data.link),
        isTest: row.data.test === true,
      };
    }

    default:
      return { ...base, kind: "unknown" };
  }
};
