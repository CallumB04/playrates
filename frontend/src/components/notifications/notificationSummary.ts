import type {
    AppNotification,
    CommunityReplyNotification,
    ReplyReason,
} from "@playrates/shared";
import { BRAND_NAME } from "../../constants/brand";
import { formatCount, formatMessageCount } from "../../lib/format";
import { itemName } from "../shop/shopItems";
import { namesOf } from "./notificationSections";

const WEEKDAY = new Intl.DateTimeFormat("en-GB", { weekday: "long" });

/** The words between a reply's author and its thread, by why it reached
 *  you. Before there were reasons, every one was an answer to you. */
export const replyPhrase = (reason: ReplyReason = "reply"): string =>
    reason === "thread"
        ? "replied in your thread"
        : reason === "conversation"
          ? "also replied in"
          : "replied to you in";

/** What a reply's line ends on. Hidden, "a thread about an adult game"
 *  says no more than "your thread" already has. */
export const replyTarget = (n: CommunityReplyNotification): string =>
    n.hidden && n.reason === "thread" ? "" : ` ${n.threadTitle}`;

const one = (n: AppNotification): string => {
    switch (n.kind) {
        case "welcome":
            return `Welcome to ${BRAND_NAME}`;
        case "friend_request":
            return `${n.actor.username} sent you a friend request`;
        case "friend_accepted":
            return `${n.actor.username} accepted your friend request`;
        case "community_reply":
            return `${n.actor.username} ${replyPhrase(n.reason)}${replyTarget(n)}`;
        case "community_thread_activity":
            return `${formatMessageCount(n.count)} new ${n.count === 1 ? "message" : "messages"} in your thread`;
        case "community_upvote_milestone":
            return `${formatCount(n.milestone)} reactions on your message in ${n.threadTitle}`;
        case "review_upvote_milestone":
            return `${formatCount(n.milestone)} reactions on your review of ${n.gameTitle}`;
        case "list_upvote_milestone":
            return `${formatCount(n.milestone)} loves on your list ${n.listName}`;
        case "gaming_25_love_milestone":
            return `${formatCount(n.milestone)} loves on your Gaming 25`;
        case "referral_joined":
            return `${n.username} joined from your invite`;
        case "referral_active":
            return `${n.username} got going from your invite`;
        case "gift_received":
            return `${n.username} gifted you ${itemName(n.item)}`;
        case "streak_at_risk":
            return `Your ${formatCount(n.weeks)} week streak needs something by ${WEEKDAY.format(new Date(n.endsAt))}`;
        case "task_nearly_done":
            return `Nearly there: ${n.label}`;
        case "announcement":
            return n.title;
        case "unknown":
            return "New notification";
    }
};

/**
 * A row's first line as plain words, the way the bell says it: for the
 * toast that names what was just cleared.
 */
export const summaryOf = (items: AppNotification[]): string => {
    const first = items[0]!;
    if (items.length > 1 && first.kind === "friend_accepted") {
        return `${namesOf(items.map((n) => ("actor" in n && n.actor ? n.actor.username : "")))} accepted your friend requests`;
    }
    if (items.length > 1 && first.kind === "community_reply") {
        const names = [
            ...new Set(
                items.map((n) =>
                    "actor" in n && n.actor ? n.actor.username : ""
                )
            ),
        ];
        return `${namesOf(names)} ${replyPhrase(first.reason)}${replyTarget(first)}`;
    }
    return one(first);
};
