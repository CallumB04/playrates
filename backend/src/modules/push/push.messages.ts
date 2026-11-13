import { replyReasonOf, type NotificationKind } from "@playrates/shared";
import type { PushPayload } from "../../config/push.js";
import { endDay, giftItemName, giftPath } from "../email/email.templates.js";

/** The bell's kinds that also push. Reminders only for those who asked. */
export const PUSHED: ReadonlySet<NotificationKind> = new Set([
  "friend_request",
  "friend_accepted",
  "community_reply",
  "gift_received",
  "streak_at_risk",
  "task_nearly_done",
]);

export const isReminder = (kind: NotificationKind) =>
  kind === "streak_at_risk" || kind === "task_nearly_done";

const str = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;
const num = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

/**
 * A notification as a push: the bell's words, short enough for a lock
 * screen. Null when something it needs is missing, as for an email.
 */
export const pushMessage = (
  kind: NotificationKind,
  data: Record<string, unknown>,
  actor: string | null,
  recipient: string,
): PushPayload | null => {
  switch (kind) {
    case "friend_request":
      return actor
        ? {
            title: "Friend request",
            body: `${actor} sent you a friend request`,
            url: `/user/${encodeURIComponent(recipient)}/friends`,
            tag: `friend_request:${actor}`,
          }
        : null;

    case "friend_accepted":
      return actor
        ? {
            title: "New friend",
            body: `${actor} accepted your friend request`,
            url: `/user/${encodeURIComponent(actor)}`,
            tag: `friend_accepted:${actor}`,
          }
        : null;

    case "community_reply": {
      const threadId = num(data.threadId);
      const messageId = num(data.messageId);
      if (!actor || threadId === null || messageId === null) return null;
      const reason = replyReasonOf(data.reason);
      return {
        title:
          reason === "thread"
            ? `${actor} replied in your thread`
            : reason === "conversation"
              ? `${actor} also replied`
              : `${actor} replied to you`,
        body: str(data.excerpt) ?? str(data.threadTitle) ?? "",
        url: `/community/thread/${threadId}#message-${messageId}`,
        tag: `reply:${messageId}`,
      };
    }

    case "gift_received": {
      const item = str(data.item);
      const giver = str(data.username) ?? actor;
      if (!item || !giver) return null;
      return {
        title: "A gift",
        body: `${giver} sent you ${giftItemName(item)}`,
        url: giftPath(item, recipient),
        tag: `gift:${item}:${giver}`,
      };
    }

    case "streak_at_risk": {
      const weeks = num(data.weeks);
      const endsAt = str(data.endsAt);
      if (weeks === null || !endsAt) return null;
      return {
        title: `Your ${weeks} week streak needs something by ${endDay(endsAt, str(data.zone))}`,
        body:
          data.shield === true
            ? "If not, a shield will keep it going."
            : "Log, rate, review or post anything to keep it.",
        url: "/progress#streak",
        tag: "streak",
      };
    }

    case "task_nearly_done": {
      const label = str(data.label);
      const count = num(data.count);
      const target = num(data.target);
      const endsAt = str(data.endsAt);
      if (!label || count === null || target === null || !endsAt) return null;
      return {
        title: `Nearly there: ${label}`,
        body: `${count} of ${target}, ends ${endDay(endsAt, str(data.zone))}.`,
        url: "/progress",
        tag: "task",
      };
    }

    default:
      return null;
  }
};

/** To the admins, when someone finishes signing up. Not a notification:
 *  it has no bell entry, and nobody else gets it. */
export const joinedMessage = (username: string): PushPayload => ({
  title: "New member",
  body: `${username} just joined PlayRates`,
  url: `/user/${encodeURIComponent(username)}`,
  tag: `joined:${username}`,
});
