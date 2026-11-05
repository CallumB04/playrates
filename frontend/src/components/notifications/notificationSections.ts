import {
    awaitingAnswer,
    notificationGroupKey,
    type AppNotification,
} from "@playrates/shared";

/** One row in the bell: a notification, or several of a kind on one day. */
export interface FeedEntry {
    key: string;
    /** Newest first. */
    items: AppNotification[];
}

export type SectionId = "needs" | "new" | "week" | "earlier";

export interface FeedSection {
    id: SectionId;
    label: string;
    entries: FeedEntry[];
}

const LABELS: Record<SectionId, string> = {
    needs: "Needs you",
    new: "New",
    week: "This week",
    earlier: "Earlier",
};

const WEEK_MS = 7 * 86_400_000;

/** The browser's own day, which is the member's time zone in practice:
 *  the server counts the badge's rows by that. */
const groupKey = (n: AppNotification) =>
    notificationGroupKey(
        {
            id: n.id,
            kind: n.kind,
            threadId: "threadId" in n ? n.threadId : null,
        },
        new Date(n.createdAt).toDateString()
    );

const grouped = (notifications: AppNotification[]): FeedEntry[] => {
    const entries = new Map<string, FeedEntry>();
    for (const n of notifications) {
        const key = groupKey(n);
        const entry = entries.get(key);
        if (entry) entry.items.push(n);
        else entries.set(key, { key, items: [n] });
    }
    return [...entries.values()];
};

/**
 * The bell's list, in the order it reads: what waits on an answer, what's
 * arrived since it was last opened, then the rest of the week and before.
 * `seenAt` is when it was opened before this time; null if never, when
 * everything unread is new.
 */
export const feedSections = (
    notifications: AppNotification[],
    seenAt: string | null,
    now: Date = new Date()
): FeedSection[] => {
    const buckets: Record<SectionId, AppNotification[]> = {
        needs: [],
        new: [],
        week: [],
        earlier: [],
    };
    for (const n of notifications) {
        if (awaitingAnswer(n)) buckets.needs.push(n);
        else if (n.readAt === null && (seenAt === null || n.createdAt > seenAt))
            buckets.new.push(n);
        else if (now.getTime() - Date.parse(n.createdAt) < WEEK_MS)
            buckets.week.push(n);
        else buckets.earlier.push(n);
    }
    return (Object.keys(buckets) as SectionId[])
        .filter((id) => buckets[id].length > 0)
        .map((id) => ({
            id,
            label: LABELS[id],
            entries: grouped(buckets[id]),
        }));
};

/** "halcyon", "halcyon and marlowe", "halcyon, marlowe and 2 others". */
export const namesOf = (usernames: string[]): string => {
    const [first, second] = usernames;
    if (usernames.length <= 1) return first ?? "";
    if (usernames.length === 2) return `${first} and ${second}`;
    const others = usernames.length - 2;
    return `${first}, ${second} and ${others} ${others === 1 ? "other" : "others"}`;
};
