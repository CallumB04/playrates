import { EyeOff, Trash2, TriangleAlert, type LucideIcon } from "lucide-react";
import {
    GAMING_25_CATEGORIES,
    METALS,
    QUESTS,
    REACTIONS,
    badgeDef,
    emailScopeLabel,
    type ActivityGroup,
    type ActivityKind,
    type AdminActivityEvent,
    type EmailScope,
} from "@playrates/shared";
import {
    STATUS_PRESENTATION,
    displayStatusFor,
    isDisplayStatus,
    type DisplayStatus,
    type GameStatus,
    type PlayedStatus,
} from "../../../constants/gameStatus";
import { threadPath } from "../../../components/community/paths";
import { itemName } from "../../../components/shop/shopItems";
import { gaming25Path, listPath } from "../../../lib/profilePaths";

export const GROUP_LABELS: Record<ActivityGroup, string> = {
    account: "Accounts",
    logs: "Logs",
    reviews: "Reviews",
    community: "Community",
    lists: "Lists",
    gaming25: "Gaming 25",
    progress: "Progress",
    shop: "Shop",
    social: "Friends",
    moderation: "Moderation",
};

/** Each kind as the filter offers it: what you'd be looking at. */
export const KIND_LABELS: Record<ActivityKind, string> = {
    signup: "Joined",
    onboarded: "Finished setting up",
    profile_updated: "Profile changes",
    email_prefs_changed: "Email settings",
    account_deleted: "Accounts closed",
    log_added: "Logged",
    log_updated: "Log changes",
    log_removed: "Logs removed",
    review_posted: "Reviews posted",
    review_edited: "Reviews edited",
    review_removed: "Reviews deleted",
    review_upvoted: "Reactions to reviews",
    thread_created: "Threads started",
    thread_removed: "Threads removed",
    message_posted: "Messages",
    message_edited: "Messages edited",
    message_deleted: "Messages deleted",
    message_upvoted: "Reactions to messages",
    list_created: "Lists made",
    list_updated: "Lists edited",
    list_deleted: "Lists deleted",
    list_game_added: "Games added to lists",
    list_game_removed: "Games taken off lists",
    list_loved: "Lists loved",
    g25_picked: "Picks",
    g25_unpicked: "Picks cleared",
    g25_completed: "Finished",
    g25_loved: "Loved",
    level_up: "Levels",
    badge_earned: "Badges",
    task_done: "Tasks done",
    task_swapped: "Tasks swapped",
    streak_kept: "Streaks kept",
    setup_done: "Getting started finished",
    item_bought: "Shop purchases",
    background_bought: "Backgrounds",
    gift_sent: "Gifts",
    tokens_granted: "Tokens given by an admin",
    friend_requested: "Friend requests",
    friend_accepted: "New friends",
    friend_removed: "Unfriended",
    referral_joined: "Joined from an invite",
    referral_active: "Invites paid",
    report_filed: "Reports",
    report_resolved: "Reports handled",
    announcement_sent: "Announcements",
    announcement_emailed: "Announcements emailed",
    announcement_retracted: "Announcements taken back",
};

const REMOVALS = new Set([
    "account_deleted",
    "log_removed",
    "review_removed",
    "thread_removed",
    "message_deleted",
    "friend_removed",
    "list_deleted",
    "list_game_removed",
    "g25_unpicked",
    "announcement_retracted",
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

const num = (value: unknown): number | null =>
    typeof value === "number" && Number.isFinite(value) ? value : null;

const strings = (value: unknown): string[] =>
    Array.isArray(value)
        ? value.filter((v): v is string => typeof v === "string")
        : [];

/** "Fire", for a reaction other than the plain upvote; null for that. */
const reactionName = (value: unknown): string | null => {
    const key = str(value);
    if (!key || key === "upvote") return null;
    return REACTIONS.find((r) => r.key === key)?.label ?? key;
};

/** A list of things, as a sentence says it: "a, b and c". */
const andList = (items: string[]): string =>
    items.length <= 1
        ? (items[0] ?? "")
        : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;

const emailNames = (scopes: string[]): string =>
    scopes.includes("all")
        ? "all their"
        : andList(
              scopes.map((s) => emailScopeLabel(s as EmailScope).toLowerCase())
          );

const xpAfter = (xp: unknown): string | null => {
    const n = num(xp);
    return n && n > 0 ? `for ${n} XP` : null;
};

const categoryOf = (value: unknown): string =>
    (
        GAMING_25_CATEGORIES.find((c) => c.key === value)?.label ?? "pick"
    ).toLowerCase();

const questOf = (value: unknown): string =>
    QUESTS.find((q) => q.key === value)?.label ?? "a task";

const tokensAfter = (value: unknown): string | null => {
    const n = num(value);
    return n && n > 0 ? `for ${n} tokens` : null;
};

/** One readable line per event. Pure, so every kind's wording is tested. */
export const activitySummary = (event: AdminActivityEvent): ActivitySummary => {
    const d = event.data;
    // A closed account's line keeps no name: closing it erases that.
    const who =
        event.actor?.username ??
        (event.kind === "account_deleted" ? "Someone" : "A deleted account");
    const game = event.game?.title ?? "a game";
    const gameHref = event.game ? `/game/${event.game.id}` : null;
    const threadId = typeof d.threadId === "number" ? d.threadId : null;
    const threadTitle = str(d.threadTitle) ?? "a thread";
    const threadHref = threadId ? threadPath(threadId) : null;
    const person = event.subjectUsername ?? "someone";
    const listName = str(d.name) ?? "a list";
    const listHref =
        event.actor && event.subjectId
            ? listPath(event.actor.username, Number(event.subjectId))
            : null;
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
        case "onboarded":
            return line("finished setting up");
        case "email_prefs_changed": {
            const off = strings(d.off);
            const on = strings(d.on);
            if (off.length > 0 && on.length === 0)
                return line(`turned off ${emailNames(off)} emails`);
            if (on.length > 0 && off.length === 0)
                return line(`turned ${emailNames(on)} emails back on`);
            return line("changed which emails they get");
        }
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
        case "review_upvoted": {
            const reaction = reactionName(d.reaction);
            return line(
                reaction
                    ? `reacted ${reaction} to a review of`
                    : "upvoted a review of",
                game,
                gameHref
            );
        }

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
        case "message_upvoted": {
            const reaction = reactionName(d.reaction);
            return line(
                reaction
                    ? `reacted ${reaction} to a message in`
                    : "upvoted a message in",
                threadTitle,
                threadHref
            );
        }

        case "list_created":
            return line("made the list", listName, listHref);
        case "list_updated":
            return line(
                `changed the ${andList(strings(d.fields)) || "details"} of`,
                listName,
                listHref
            );
        case "list_deleted":
            return line("deleted their list", listName);
        case "list_game_added":
            return line("added", game, gameHref, { after: `to ${listName}` });
        case "list_game_removed":
            return line("took", game, gameHref, { after: `off ${listName}` });
        case "list_loved":
            return line("loved the list", listName);

        case "g25_picked":
            return line("picked", game, gameHref, {
                after: `as their ${categoryOf(d.category)}`,
            });
        case "g25_unpicked":
            return line("took", game, gameHref, {
                after: `out as their ${categoryOf(d.category)}`,
            });
        case "g25_completed":
            return line(
                "finished their",
                "Gaming 25",
                event.actor ? gaming25Path(event.actor.username) : null
            );
        case "g25_loved":
            return line(
                "loved",
                `${person}’s Gaming 25`,
                event.subjectUsername
                    ? gaming25Path(event.subjectUsername)
                    : null
            );

        case "level_up":
            return line(`reached level ${num(d.level) ?? "?"}`);
        case "badge_earned": {
            const metal = num(d.metal);
            return line(
                "earned",
                badgeDef(str(d.badge) ?? "")?.name ?? str(d.badge) ?? "a badge",
                null,
                {
                    after: metal
                        ? `in ${METALS[metal - 1] ?? "a metal"}`
                        : null,
                }
            );
        }
        case "task_done":
            return line("did the task", questOf(d.quest), null, {
                after: xpAfter(d.xp),
            });
        case "task_swapped":
            return line("swapped out the task", questOf(d.quest));
        case "streak_kept":
            return line("kept their weekly streak", null, null, {
                after: xpAfter(d.xp),
            });
        case "setup_done":
            return line("finished getting started", null, null, {
                after: xpAfter(d.xp),
            });

        case "item_bought":
            return line("bought", itemName(str(d.item) ?? ""), null, {
                after: tokensAfter(d.tokens),
            });
        case "background_bought":
            return num(d.tokens)
                ? line("bought a background from", game, gameHref, {
                      after: tokensAfter(d.tokens),
                  })
                : line("took their free background from", game, gameHref);
        case "gift_sent":
            return line("gave", person, personHref, {
                after: `${itemName(str(d.item) ?? "")}${tokensAfter(d.tokens) ? `, ${tokensAfter(d.tokens)}` : ""}`,
            });
        case "tokens_granted":
            return line(`was given ${num(d.tokens) ?? 0} tokens by an admin`);

        case "report_filed":
            return line(
                `reported a ${str(d.targetType) ?? "post"}`,
                null,
                null,
                {
                    after: str(d.reason) ? `for ${str(d.reason)}` : null,
                }
            );
        case "report_resolved":
            return line(
                `${str(d.status) === "dismissed" ? "dismissed" : "dealt with"} a report on a ${str(d.targetType) ?? "post"}`
            );
        case "announcement_sent":
            return line(
                d.patchNotes === true
                    ? "sent the patch notes"
                    : "sent the announcement",
                str(d.title) ?? "an announcement"
            );
        case "announcement_emailed":
            return line("emailed", str(d.title) ?? "an announcement");
        case "announcement_retracted":
            return line(
                "took back the announcement",
                str(d.title) ?? "an announcement"
            );

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
        case "referral_joined":
            return line("joined from an invite by", person, personHref);
        case "referral_active":
            return line("was paid for inviting", person, personHref, {
                after: xpAfter(d.xp),
            });

        default:
            return line(event.kind.replace(/_/g, " "));
    }
};
