import { useCallback, useMemo, useReducer, type ReactNode } from "react";
import {
    notificationQueue,
    type NotificationSeverity,
    type NotificationType,
    type ToastAction,
} from "./notificationQueue";
import { NotificationContext } from "./NotificationContext";

// A counter rather than Date.now(): two toasts raised in the same millisecond
// would share a React key, and the second would inherit the first's timers.
let nextId = 0;

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
    const [toasts, dispatch] = useReducer(notificationQueue, []);

    const notify = useCallback(
        (
            text: ReactNode,
            type: NotificationType,
            severity?: NotificationSeverity,
            action?: ToastAction,
            options?: { join?: ReactNode }
        ) =>
            dispatch({
                kind: "push",
                id: nextId++,
                text,
                type,
                severity,
                action,
                at: Date.now(),
                join: options?.join,
            }),
        []
    );

    const dismiss = useCallback(
        (id: number) => dispatch({ kind: "dismiss", id }),
        []
    );

    const remove = useCallback(
        (id: number) => dispatch({ kind: "remove", id }),
        []
    );

    const value = useMemo(
        () => ({ toasts, notify, dismiss, remove }),
        [toasts, notify, dismiss, remove]
    );

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};
