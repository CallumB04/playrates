import { EyeOff, Trash2, TriangleAlert, type LucideIcon } from "lucide-react";
import type { ActivityGroup, AdminActivityEvent } from "@playrates/shared";
import {
    STATUS_PRESENTATION,
    displayStatusFor,
    isDisplayStatus,
    type DisplayStatus,
    type GameStatus,
    type PlayedStatus,
} from "../../../constants/gameStatus";
import { threadPath } from "../../../components/community/paths";

export const GROUP_LABELS: Record<ActivityGroup, string> = {
    account: "Accounts",
    logs: "Logs",
    reviews: "Reviews",
    community: "Community",
    social: "Friends",
};

const REMOVALS = new Set([
    "account_deleted",
    "log_removed",
    "review_removed",
    "thread_removed",
    "message_deleted",
    "friend_removed",
]);

export const isRemoval = (kind: string): boolean => REMOVALS.has(kind);

interface LogState {
    status?: string | null;
    playedStatus?: string | null;
    rating?: number | string | null;
}

const asLog = (value: unknown): LogState =>
    value && typeof value === "object" ? (value as LogState) : {};

const shelfOf = (log: LogState): DisplayStatus | null =>
    log.status && isDisplayStatus(log.status)
        ? displayStatusFor(
              log.status as GameStatus,
              (log.playedStatus ?? null) as PlayedStatus | null
          )
        : null;

const shelfLabel = (log: LogState): string => {
    const shelf = shelfOf(log);
    return shelf ? STATUS_PRESENTATION[shelf].label : "a shelf";
};

const ratingOf = (log: LogState): number | null =>
    log.rating === null || log.rating === undefined ? null : Number(log.rating);

/** The home feed's verbs, so a log reads the same here as it does there. */
const VERB: Record<DisplayStatus, string> = {
    played: "logged",
    playing: "started",
    backlog: "added to their backlog",
    wishlist: "wishlisted",
    finished: "finished",
    mastered: "mastered",
    shelved: "shelved",
    retired: "gave up on",
};

/** The one mark a row's meta line carries: the shelf a log is on, in its own
 *  hue, or that something went. Nothing else gets colour. */
export interface ActivityMark {
    icon: LucideIcon;
    label: string;
    className: string;
}

export const activityMark = (
    event: AdminActivityEvent
): ActivityMark | null => {
    if (isRemoval(event.kind)) {
        return { icon: Trash2, label: "Removed", className: "text-danger" };
    }
    if (event.group === "logs") {
        const shelf = shelfOf(
            asLog(event.kind === "log_updated" ? event.data.to : event.data)
        );
        if (shelf) {
            const { icon, label, markTone } = STATUS_PRESENTATION[shelf];
            return { icon, label, className: markTone };
        }
    }
    if (event.data.isPublic === false) {
        return {
            icon: EyeOff,
            label: "Private",
            className: "text-content-muted",
        };
    }
    if (event.data.containsSpoilers === true) {
        return {
            icon: TriangleAlert,
            label: "Spoilers",
            className: "text-content-muted",
        };
    }
    return null;
};

/** "<who> <action> <target> <after>", with the target linkable. */
export interface ActivitySummary {
    who: string;
    action: string;
    target: string | null;
    href: string | null;
    /** Words after the target: "from Backlog to Playing". */
    after: string | null;
    /** A rating to show as the app shows ratings. */
    rating: number | null;
}

const str = (value: unknown): string | null =>
    typeof value === "string" && value !== "" ? value : null;

/** One readable line per event. Pure, so every kind's wording is tested. */
export const activitySummary = (event: AdminActivityEvent): ActivitySummary => {
    const d = event.data;
    const who =
        event.actor?.username ??
        (event.kind === "account_deleted" ? str(d.username) : null) ??
        "A deleted account";
    const game = event.game?.title ?? "a game";
    const gameHref = event.game ? `/game/${event.game.id}` : null;
    const threadId = typeof d.threadId === "number" ? d.threadId : null;
    const threadTitle = str(d.threadTitle) ?? "a thread";
    const threadHref = threadId ? threadPath(threadId) : null;
    const person = event.subjectUsername ?? "someone";
    const personHref = event.subjectUsername
        ? `/user/${event.subjectUsername}`
        : null;

    const line = (
        action: string,
        target: string | null = null,
        href: string | null = null,
        extra: Partial<Pick<ActivitySummary, "after" | "rating">> = {}
    ): ActivitySummary => ({
        who,
        action,
        target,
        href,
        after: null,
        rating: null,
        ...extra,
    });

    switch (event.kind) {
        case "signup":
            return line("joined PlayRates");
        case "account_deleted":
            return line("closed their account");
        case "profile_updated": {
            const fields = Array.isArray(d.fields)
                ? (d.fields as string[])
                : [];
            if (fields.includes("username") && str(d.previousUsername)) {
                return line("changed their name from", str(d.previousUsername));
            }
            const what = fields.filter((f) => f !== "username");
            return line(
                `changed their ${what.length > 0 ? what.join(" and ") : "profile"}`
            );
        }

        case "log_added": {
            const log = asLog(d);
            const shelf = shelfOf(log);
            return line(shelf ? VERB[shelf] : "logged", game, gameHref, {
                rating: ratingOf(log),
            });
        }
        case "log_updated": {
            const from = asLog(d.from);
            const to = asLog(d.to);
            const before = ratingOf(from);
            const after = ratingOf(to);
            const rating = after !== before ? after : null;
            if (shelfOf(from) !== shelfOf(to)) {
                return line("moved", game, gameHref, {
                    after: `from ${shelfLabel(from)} to ${shelfLabel(to)}`,
                    rating,
                });
            }
            return after === null
                ? line("took the rating off", game, gameHref)
                : line("rated", game, gameHref, { rating });
        }
        case "log_removed":
            return line("took", game, gameHref, {
                after: `off ${shelfLabel(asLog(d))}`,
            });

        case "review_posted":
            return line("reviewed", game, gameHref);
        case "review_edited":
            return line("rewrote their review of", game, gameHref);
        case "review_removed":
            return line("deleted their review of", game, gameHref);
        case "review_upvoted":
            return line("upvoted a review of", game, gameHref);

        case "thread_created":
            return line(
                "started",
                str(d.title) ?? "a thread",
                event.subjectId ? threadPath(Number(event.subjectId)) : null
            );
        case "thread_removed":
            return line("lost their thread", str(d.title) ?? "a thread");
        case "message_posted":
            return line(
                d.isReply === true ? "answered someone in" : "posted in",
                threadTitle,
                threadHref
            );
        case "message_edited":
            return line("edited a message in", threadTitle, threadHref);
        case "message_deleted":
            return line("deleted a message in", threadTitle, threadHref);
        case "message_upvoted":
            return line("upvoted a message in", threadTitle, threadHref);

        case "friend_requested":
            return line("asked to be friends with", person, personHref);
        case "friend_accepted":
            return line("became friends with", person, personHref);
        case "friend_removed":
            return line(
                d.wasAccepted === false
                    ? "withdrew their request to"
                    : "unfriended",
                person,
                personHref
            );

        default:
            return line(event.kind.replace(/_/g, " "));
    }
};
