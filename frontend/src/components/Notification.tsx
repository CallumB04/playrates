import {
    useNotificationState,
    type NotificationType,
} from "../contexts/NotificationContext";

interface NotificationStyle {
    textColor: string;
    bgColor: string;
    iconName: string;
}

/** Static map, so the unsafe non-null assertion on the old lookup is gone. */
const NOTIFICATION_STYLES: Record<NotificationType, NotificationStyle> = {
    success: {
        textColor: "text-success",
        bgColor: "bg-success-subtle",
        iconName: "circle-check",
    },
    error: {
        textColor: "text-danger",
        bgColor: "bg-danger-subtle",
        iconName: "circle-xmark",
    },
    pending: {
        textColor: "text-warning",
        bgColor: "bg-warning-subtle",
        iconName: "clock",
    },
};

/**
 * Reads from context instead of taking text and type as props, which removes
 * `runNotification` from nine component signatures.
 */
const Notification = () => {
    const { notification } = useNotificationState();

    if (!notification) return null;

    const { textColor, bgColor, iconName } =
        NOTIFICATION_STYLES[notification.type];

    return (
        <p
            // the id as key remounts the element, restarting the CSS animation
            key={notification.id}
            role="status"
            aria-live="polite"
            className={`${textColor} ${bgColor} notification-fadeout fixed bottom-8 right-1/2 z-50 mx-auto flex h-max w-max translate-x-1/2 flex-row items-center gap-x-2 rounded-md px-4 py-2 font-lexend text-lg sm:right-8 sm:translate-x-0`}
        >
            <i className={`fa-regular fa-${iconName}`} aria-hidden="true"></i>
            <span>{notification.text}</span>
        </p>
    );
};

export default Notification;
