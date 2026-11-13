import { createContext, useContext, type ReactNode } from "react";
import {
    type NotificationSeverity,
    type NotificationType,
    type Toast,
    type ToastAction,
} from "./notificationQueue";

export type { NotificationSeverity, NotificationType, Toast, ToastAction };

export interface NotificationContextValue {
    toasts: Toast[];
    notify: (
        text: ReactNode,
        type: NotificationType,
        severity?: NotificationSeverity,
        action?: ToastAction,
        /** `join`: said after the newest toast instead, while that one is
         *  a plain success still on screen, rather than stacking another. */
        options?: { join?: ReactNode }
    ) => void;
    /** Starts the exit; the toast asks to be removed once it has played. */
    dismiss: (id: number) => void;
    remove: (id: number) => void;
}

export const NotificationContext =
    createContext<NotificationContextValue | null>(null);

export const useNotificationState = (): NotificationContextValue => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error(
            "useNotificationState must be used within a NotificationProvider"
        );
    }
    return context;
};

/** What most components want; the full state is only needed by the stack. */
export const useNotify = () => useNotificationState().notify;
