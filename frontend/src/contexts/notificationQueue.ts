import { createElement, Fragment, type ReactNode } from "react";

export type NotificationType = "success" | "info" | "error";

/**
 * How long a toast has earned on screen. Severity decides, not type: a failed
 * autosave and a failed account deletion are both errors, and they do not
 * deserve the same dwell.
 */
export type NotificationSeverity = "low" | "normal" | "high" | "critical";

/** Milliseconds on screen. `null` waits for the X — nothing takes it away. */
export const DWELL_MS: Record<NotificationSeverity, number | null> = {
    low: 4000,
    normal: 7000,
    high: 12000,
    critical: null,
};

const DEFAULT_SEVERITY: Record<NotificationType, NotificationSeverity> = {
    success: "low",
    info: "normal",
    error: "high",
};

/** An offer to share a moment: long enough to take in and reach for, but
 *  a badge isn't a question, so it doesn't wait for an answer. */
export const OFFER_DWELL_MS = 20_000;

/** Something to do about a toast, as a button on it. */
export interface ToastAction {
    label: string;
    onClick: () => void;
    /** How long it's on offer, where it's only for a moment, as Undo is.
     *  Without one the toast waits to be pressed or closed. */
    dwell?: number;
}

export interface Toast {
    id: number;
    text: ReactNode;
    action?: ToastAction;
    type: NotificationType;
    severity: NotificationSeverity;
    dwell: number | null;
    /** Playing its exit: still mounted, but no longer holding a slot. */
    leaving: boolean;
    /** When it was raised, so a follow-up can tell it's still fresh. */
    at: number;
}

/** How long a plain success toast takes a follow-up into its own line,
 *  rather than one more toast stacking over the page. */
export const JOIN_WINDOW_MS = 5000;

/** Four is a wall of text in the corner of the screen. */
export const MAX_VISIBLE = 3;

export type QueueAction =
    | {
          kind: "push";
          id: number;
          text: ReactNode;
          type: NotificationType;
          severity?: NotificationSeverity;
          action?: ToastAction;
          at: number;
          /** Said after the newest toast instead, if that one is a plain
           *  success still fresh: "Entry updated · +5 XP". */
          join?: ReactNode;
      }
    | { kind: "dismiss"; id: number }
    | { kind: "remove"; id: number };

const joined = (first: ReactNode, then: ReactNode): ReactNode =>
    createElement(
        Fragment,
        null,
        first,
        createElement("span", { "aria-hidden": true }, " · "),
        then
    );

/** Oldest first, so the newest renders at the bottom of the stack. */
export const notificationQueue = (
    state: Toast[],
    action: QueueAction
): Toast[] => {
    switch (action.kind) {
        case "push": {
            if (action.join !== undefined) {
                const last = state.filter((toast) => !toast.leaving).at(-1);
                if (
                    last &&
                    last.type === "success" &&
                    !last.action &&
                    action.at - last.at < JOIN_WINDOW_MS
                ) {
                    return state.map((toast) =>
                        toast.id === last.id
                            ? {
                                  ...toast,
                                  text: joined(toast.text, action.join),
                              }
                            : toast
                    );
                }
            }
            const severity = action.severity ?? DEFAULT_SEVERITY[action.type];
            const next = [
                ...state,
                {
                    id: action.id,
                    text: action.text,
                    type: action.type,
                    severity,
                    action: action.action,
                    // One that offers something to do stays until it's done
                    // or closed: a button on a clock is gone before a slow
                    // reader reaches it. Unless the offer itself is brief.
                    dwell: action.action
                        ? (action.action.dwell ?? null)
                        : DWELL_MS[severity],
                    leaving: false,
                    at: action.at,
                },
            ];

            const standing = next.filter((toast) => !toast.leaving);
            if (standing.length <= MAX_VISIBLE) return next;

            // A toast that waits for the X is waiting for an answer, so it
            // keeps its slot until every other one is waiting too. Never the
            // arrival itself, which is the last of `standing`.
            const older = standing.slice(0, -1);
            const crowdedOut =
                older.find((toast) => toast.dwell !== null) ?? older[0];

            return next.map((toast) =>
                toast.id === crowdedOut.id ? { ...toast, leaving: true } : toast
            );
        }

        case "dismiss":
            return state.map((toast) =>
                toast.id === action.id ? { ...toast, leaving: true } : toast
            );

        case "remove":
            return state.filter((toast) => toast.id !== action.id);
    }
};
