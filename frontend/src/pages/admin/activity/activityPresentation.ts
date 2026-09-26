import {
    ArrowBigUp,
    BookOpen,
    CircleUserRound,
    Handshake,
    MessageSquareReply,
    MessagesSquare,
    NotebookPen,
    PenLine,
    Trash2,
    UserMinus,
    UserPlus,
    UserRoundPen,
    type LucideIcon,
} from "lucide-react";
import type { ActivityGroup, AdminActivityEvent } from "@playrates/shared";
import {
    STATUS_PRESENTATION,
    displayStatusFor,
    isDisplayStatus,
} from "../../../constants/gameStatus";
import type { GameStatus, PlayedStatus } from "../../../constants/gameStatus";
import { threadPath } from "../../../components/community/paths";
import { formatRatingOutOfTen } from "../../../lib/format";

export interface ActivityTone {
    /** The bar down the row's edge. */
    bar: string;
    /** The icon's colour. */
    icon: string;
}

/** Colour by what the event is about; anything taken away is danger,
 *  whatever it was. */
export const GROUP_TONES: Record<ActivityGroup, ActivityTone & { label: string }> = {
    account: { label: "Accounts", bar: "bg-brand", icon: "text-brand" },
    logs: { label: "Logs", bar: "bg-status-playing", icon: "text-status-playing" },
    reviews: { label: "Reviews", bar: "bg-info", icon: "text-info" },
    community: { label: "Community", bar: "bg-success", icon: "text-success" },
    social: { label: "Friends", bar: "bg-accent", icon: "text-accent" },
};

const REMOVAL: ActivityTone = { bar: "bg-danger", icon: "text-danger" };

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

const shelfOf = (log: LogState) =>
    log.status && isDisplayStatus(log.status)
        ? displayStatusFor(
              log.status as GameStatus,
              (log.playedStatus ?? null) as PlayedStatus | null
          )
        : null;

const shelfLabel = (log: LogState): string => {
    const shelf = shelfOf(log);
    return shelf ? STATUS_PRESENTATION[shelf].label : (log.status ?? "a shelf");
};

const rating = (log: LogState): number | null =>
    log.rating === null || log.rating === undefined ? null : Number(log.rating);

export const activityTone = (event: AdminActivityEvent): ActivityTone => {
    if (isRemoval(event.kind)) return REMOVAL;
    // A log wears the colour of the shelf it landed on.
    if (event.group === "logs") {
        const shelf = shelfOf(asLog(event.kind === "log_updated" ? event.data.to : event.data));
        if (shelf) {
            const { accent, markTone } = STATUS_PRESENTATION[shelf];
            return { bar: accent, icon: markTone };
        }
    }
    return event.group ? GROUP_TONES[event.group] : GROUP_TONES.account;
};

const ICONS: Record<string, LucideIcon> = {
    signup: UserPlus,
    profile_updated: UserRoundPen,
    account_deleted: CircleUserRound,
    log_added: NotebookPen,
    log_updated: NotebookPen,
    log_removed: Trash2,
    review_posted: BookOpen,
    review_edited: PenLine,
    review_removed: Trash2,
    review_upvoted: ArrowBigUp,
    thread_created: MessagesSquare,
    thread_removed: Trash2,
    message_posted: MessageSquareReply,
    message_edited: PenLine,
    message_deleted: Trash2,
    message_upvoted: ArrowBigUp,
    friend_requested: UserPlus,
    friend_accepted: Handshake,
    friend_removed: UserMinus,
};

export const activityIcon = (kind: string): LucideIcon =>
    ICONS[kind] ?? CircleUserRound;

/** "<who> <action> <target>", with the target linkable. */
export interface ActivitySummary {
    who: string;
    action: string;
    target: string | null;
    href: string | null;
    /** Small facts worth seeing without expanding: "private", "8/10". */
    tags: string[];
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
    const person = event.subjectUsername;
    const personHref = person ? `/user/${person}` : null;

    const line = (
        action: string,
        target: string | null = null,
        href: string | null = null,
        tags: string[] = []
    ): ActivitySummary => ({ who, action, target, href, tags });

    switch (event.kind) {
        case "signup":
            return line("joined PlayRates");
        case "account_deleted":
            return line("deleted their account");
        case "profile_updated": {
            const fields = Array.isArray(d.fields) ? (d.fields as string[]) : [];
            if (fields.includes("username") && str(d.previousUsername)) {
                return line(`changed their username from ${d.previousUsername}`);
            }
            const what = fields.filter((f) => f !== "username");
            return line(
                `updated their ${what.length > 0 ? what.join(" and ") : "profile"}`
            );
        }

        case "log_added": {
            const log = asLog(d);
            const score = rating(log);
            return line(`added to ${shelfLabel(log)}`, game, gameHref,
                score === null ? [] : [formatRatingOutOfTen(score)]);
        }
        case "log_updated": {
            const from = asLog(d.from);
            const to = asLog(d.to);
            const moved = shelfOf(from) !== shelfOf(to);
            const before = rating(from);
            const after = rating(to);
            const tags =
                after !== before
                    ? [after === null ? "rating cleared" : formatRatingOutOfTen(after)]
                    : [];
            if (moved) {
                return line(`moved from ${shelfLabel(from)} to ${shelfLabel(to)}`, game, gameHref, tags);
            }
            return line(after === null ? "cleared their rating of" : "rated", game, gameHref, tags);
        }
        case "log_removed":
            return line(`removed from ${shelfLabel(asLog(d))}`, game, gameHref);

        case "review_posted":
        case "review_edited": {
            const tags = [
                ...(d.isPublic === false ? ["private"] : []),
                ...(d.containsSpoilers === true ? ["spoilers"] : []),
            ];
            return line(
                event.kind === "review_posted" ? "reviewed" : "edited their review of",
                game,
                gameHref,
                tags
            );
        }
        case "review_removed":
            return line("deleted their review of", game, gameHref);
        case "review_upvoted":
            return line("upvoted a review of", game, gameHref);

        case "thread_created":
            return line(
                "started a thread",
                str(d.title) ?? "a thread",
                event.subjectId ? threadPath(Number(event.subjectId)) : null
            );
        case "thread_removed":
            return line("lost a thread", str(d.title) ?? "a thread");
        case "message_posted":
            return line(d.isReply === true ? "replied to someone in" : "posted in", threadTitle, threadHref);
        case "message_edited":
            return line("edited a message in", threadTitle, threadHref);
        case "message_deleted":
            return line("deleted a message in", threadTitle, threadHref);
        case "message_upvoted":
            return line("upvoted a message in", threadTitle, threadHref);

        case "friend_requested":
            return line("sent a friend request to", person ?? "someone", personHref);
        case "friend_accepted":
            return line("became friends with", person ?? "someone", personHref);
        case "friend_removed":
            return line(
                d.wasAccepted === false ? "withdrew a friend request to" : "unfriended",
                person ?? "someone",
                personHref
            );

        default:
            return line(event.kind.replace(/_/g, " "));
    }
};
