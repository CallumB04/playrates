import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";

export type NotificationType = "success" | "error" | "pending";

interface ActiveNotification {
    id: number;
    text: string;
    type: NotificationType;
}

interface NotificationContextValue {
    notification: ActiveNotification | null;
    notify: (text: string, type: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(
    null
);

/** How long a toast stays on screen; matches the CSS fade animation. */
const DISMISS_AFTER_MS = 7000;

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
    const [notification, setNotification] = useState<ActiveNotification | null>(
        null
    );

    // The id is the React key, so a new toast restarts the animation.
    const notify = useCallback((text: string, type: NotificationType) => {
        setNotification({ id: Date.now(), text, type });
    }, []);

    useEffect(() => {
        if (!notification) return;
        const timer = setTimeout(() => setNotification(null), DISMISS_AFTER_MS);
        return () => clearTimeout(timer);
    }, [notification]);

    const value = useMemo(
        () => ({ notification, notify }),
        [notification, notify]
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

/** What most components want; the full state is only needed by the toast. */
export const useNotify = () => useNotificationState().notify;
