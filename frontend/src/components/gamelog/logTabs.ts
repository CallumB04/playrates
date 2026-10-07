import type { LogWithReview } from "@playrates/shared";
import { emptyDraft, logReducer, type LogDraft } from "./logEditorReducer";

/** One console's log in the editor: saved already, or about to be. */
export interface LogTab {
    key: string;
    /** Null until a new log is saved. */
    logId: number | null;
    /** As it was opened, to tell what has changed. Null on a new log. */
    original: LogDraft | null;
    draft: LogDraft;
    hadReview: boolean;
}

export const NEW_TAB = "new";

export const tabForLog = (log: LogWithReview): LogTab => {
    const draft = logReducer(emptyDraft, {
        type: "hydrate",
        log,
        review: log.review
            ? {
                  body: log.review.body,
                  isPublic: log.review.isPublic,
                  containsSpoilers: log.review.containsSpoilers,
              }
            : null,
    });
    return {
        key: `log-${log.id}`,
        logId: log.id,
        original: draft,
        draft,
        hadReview: !!log.review,
    };
};

export const newTab = (system?: {
    system: string;
    platform: string;
}): LogTab => ({
    key: NEW_TAB,
    logId: null,
    original: null,
    draft: system ? { ...emptyDraft, ...system } : emptyDraft,
    hadReview: false,
});

/** Whether Save has anything to write for this tab. */
export const isDirty = (tab: LogTab): boolean =>
    tab.original === null ||
    JSON.stringify(tab.draft) !== JSON.stringify(tab.original);

/** Consoles the other tabs hold, which this one can't take. */
export const takenBy = (tabs: LogTab[], exceptKey: string): string[] =>
    tabs
        .filter((t) => t.key !== exceptKey && t.draft.system)
        .map((t) => t.draft.system);

/* With more than one log, the console is what tells them apart, so each
   needs one. A log that never named one may stay that way: it is the one
   log a game can have without. */
export const needsConsole = (tab: LogTab, tabs: LogTab[]): boolean =>
    tabs.length > 1 &&
    !tab.draft.system &&
    !(tab.logId !== null && !tab.original?.system);

/** The tab to open on: the log asked for, a new one, or the first. */
export const startingTab = (
    tabs: LogTab[],
    logId: number | null | undefined,
    headlineId: number | undefined
): string => {
    if (logId === null) return NEW_TAB;
    const wanted = logId ?? headlineId;
    return tabs.find((t) => t.logId === wanted)?.key ?? tabs[0]?.key ?? NEW_TAB;
};
