import { QUESTS } from "@playrates/shared";
import { profilePath, shelfPath } from "./profilePaths";

/** Where a task is done, by the XP it counts: the first step towards it. */
const BY_SOURCE: Record<string, (username: string) => string> = {
    rate: (u) => shelfPath(u, "played"),
    review_short: (u) => shelfPath(u, "played"),
    master: (u) => shelfPath(u, "played"),
    finish: (u) => shelfPath(u, "playing"),
    shelve: () => "/library",
    play: () => "/library",
    list: (u) => profilePath(u, "lists"),
    thread: () => "/community",
    friend: () => "/community",
    review_upvote: () => "/community",
};

/** The page a task sends you to, or null for one it can't place. */
export const questPath = (key: string, username: string): string | null => {
    const source = QUESTS.find((q) => q.key === key)?.sources[0];
    const to = source ? BY_SOURCE[source] : undefined;
    return to ? to(username) : null;
};
