import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useReducer,
    type ReactNode,
} from "react";
import {
    notificationQueue,
    type NotificationSeverity,
    type NotificationType,
    type Toast,
} from "./notificationQueue";

export type { NotificationSeverity, NotificationType, Toast };

interface NotificationContextValue {
    toasts: Toast[];
    notify: (
        text: string,
        type: NotificationType,
        severity?: NotificationSeverity
    ) => void;
    /** Starts the exit; the toast asks to be removed once it has played. */
    dismiss: (id: number) => void;
    remove: (id: number) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(
    null
);

// A counter rather than Date.now(): two toasts raised in the same millisecond
// would share a React key, and the second would inherit the first's timers.
let nextId = 0;

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
    const [toasts, dispatch] = useReducer(notificationQueue, []);

    const notify = useCallback(
        (
            text: string,
            type: NotificationType,
            severity?: NotificationSeverity
        ) => dispatch({ kind: "push", id: nextId++, text, type, severity }),
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
