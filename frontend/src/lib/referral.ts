const KEY = "pr_ref";
/** An invite is remembered this long, for the visitor who signs up later. */
const KEEP_MS = 30 * 24 * 60 * 60 * 1000;
const USERNAME = /^[A-Za-z0-9_.-]{1,40}$/;

/* Storage can be missing or refuse (a private window): an invite lost is
   a shame, never an error. */

/** Remembers who invited this visitor, from a `?ref=` in the address. */
export const captureReferral = (search: string, now = Date.now()): void => {
    const ref = new URLSearchParams(search).get("ref");
    if (!ref || !USERNAME.test(ref)) return;
    try {
        localStorage.setItem(KEY, JSON.stringify({ username: ref, at: now }));
    } catch {
        // Nowhere to keep it.
    }
};

/** The invite waiting to be claimed, if one is and it hasn't run out. */
export const pendingReferral = (now = Date.now()): string | null => {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return null;
        const { username, at } = JSON.parse(raw) as {
            username?: unknown;
            at?: unknown;
        };
        if (
            typeof username !== "string" ||
            typeof at !== "number" ||
            now - at > KEEP_MS
        ) {
            localStorage.removeItem(KEY);
            return null;
        }
        return username;
    } catch {
        return null;
    }
};

export const clearReferral = (): void => {
    try {
        localStorage.removeItem(KEY);
    } catch {
        // Already gone, as far as anyone can tell.
    }
};
