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

export interface Toast {
    id: number;
    text: string;
    type: NotificationType;
    severity: NotificationSeverity;
    dwell: number | null;
    /** Playing its exit: still mounted, but no longer holding a slot. */
    leaving: boolean;
}

/** Four is a wall of text in the corner of the screen. */
export const MAX_VISIBLE = 3;

export type QueueAction =
    | {
          kind: "push";
          id: number;
          text: string;
          type: NotificationType;
          severity?: NotificationSeverity;
      }
    | { kind: "dismiss"; id: number }
    | { kind: "remove"; id: number };

/** Oldest first, so the newest renders at the bottom of the stack. */
export const notificationQueue = (
    state: Toast[],
    action: QueueAction
): Toast[] => {
    switch (action.kind) {
        case "push": {
            const severity = action.severity ?? DEFAULT_SEVERITY[action.type];
            const next = [
                ...state,
                {
                    id: action.id,
                    text: action.text,
                    type: action.type,
                    severity,
                    dwell: DWELL_MS[severity],
                    leaving: false,
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
