import { isEmptyDoc, type RichTextDoc } from "@playrates/shared";

/** A thread started and not yet posted, kept on this device. */
export interface ThreadDraft {
    game: {
        id: number;
        title: string;
        coverUrl: string | null;
        releaseDate?: string | null;
    } | null;
    title: string;
    body: RichTextDoc | null;
}

const KEY = "playrates-draft:thread";

/* Storage can be missing or refuse (a private window, blocked site data),
   and a draft is a convenience, so every failure just means no draft. */

export const readThreadDraft = (): ThreadDraft | null => {
    try {
        const raw = localStorage.getItem(KEY);
        return raw ? (JSON.parse(raw) as ThreadDraft) : null;
    } catch {
        return null;
    }
};

export const writeThreadDraft = (draft: ThreadDraft): void => {
    try {
        localStorage.setItem(KEY, JSON.stringify(draft));
    } catch {
        // no draft, then
    }
};

export const clearThreadDraft = (): void => {
    try {
        localStorage.removeItem(KEY);
    } catch {
        // nothing to clear
    }
};

/** Whether a draft has anything in it worth keeping. */
export const hasContent = (draft: ThreadDraft): boolean =>
    !!draft.game ||
    draft.title.trim() !== "" ||
    (!!draft.body && !isEmptyDoc(draft.body));
