import { CircleCheck, CircleX, Clock } from "lucide-react";
import {
    useNotificationState,
    type NotificationType,
} from "../contexts/NotificationContext";
import type { IconComponent } from "../lib/icons";
import { cn } from "../lib/cn";

interface NotificationStyle {
    /** The tone rule down the leading edge, and the icon that matches it. */
    tone: string;
    Icon: IconComponent;
}

/** Static map: every type has an entry, so the lookup cannot miss. */
const NOTIFICATION_STYLES: Record<NotificationType, NotificationStyle> = {
    success: { tone: "border-l-success text-success", Icon: CircleCheck },
    error: { tone: "border-l-danger text-danger", Icon: CircleX },
    pending: { tone: "border-l-status-playing text-status-playing", Icon: Clock },
};

/**
 * Reads from context instead of taking text and type as props, which removes
 * `runNotification` from nine component signatures.
 */
const Notification = () => {
    const { notification } = useNotificationState();

    if (!notification) return null;

    const { tone, Icon } = NOTIFICATION_STYLES[notification.type];

    return (
        <p
            // the id as key remounts the element, restarting the CSS animation
            key={notification.id}
            role="status"
            aria-live="polite"
            className={cn(
                "fixed right-1/2 bottom-8 z-50 flex h-max w-max translate-x-1/2 animate-notification items-center gap-3",
                "rounded-lg border border-subtle border-l-[3px] bg-surface-raised px-4 py-3 shadow-modal",
                "sm:right-8 sm:translate-x-0",
                tone
            )}
        >
            <Icon size={16} aria-hidden />
            <span className="text-body-sm font-medium text-content">
                {notification.text}
            </span>
        </p>
    );
};

export default Notification;
