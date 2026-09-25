import type { ComponentType } from "react";
import {
    Archive,
    ArchiveRestore,
    Circle,
    CircleCheck,
    type LucideIcon,
} from "lucide-react";
import type { AppNotification } from "@playrates/shared";
import { usePatchNotification } from "../../hooks/queries/useNotifications";
import { relativeTime } from "../../lib/format";
import { cn } from "../../lib/cn";
import { NOTIFICATION_RENDERERS, type ContentProps } from "./registry";

/* The glyph stays small and the hit area grows around it — a touch screen
   needs 44px whatever the icon measures. */
const ACTION =
    "relative flex size-8 items-center justify-center rounded-sm text-content-muted transition-colors " +
    "before:absolute before:-inset-2 before:content-[''] hover:bg-surface-hover hover:text-content " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand " +
    "disabled:cursor-not-allowed disabled:opacity-50";

/** The mark a kind falls back to when it has no face to show. */
const IconMark = ({ icon: Icon, tone }: { icon: LucideIcon; tone: string }) => (
    <span
        className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full border border-subtle bg-surface-sunken",
            tone
        )}
    >
        <Icon size={16} aria-hidden />
    </span>
);

const RowAction = ({
    icon: Icon,
    label,
    onClick,
    disabled,
}: {
    icon: LucideIcon;
    label: string;
    onClick: () => void;
    disabled: boolean;
}) => (
    <button
        type="button"
        title={label}
        aria-label={label}
        onClick={onClick}
        disabled={disabled}
        className={cn(ACTION, !disabled && "cursor-pointer")}
    >
        <Icon size={15} aria-hidden />
    </button>
);

/**
 * The shell every notification shares — mark, timestamp, unread rule and the
 * read and archive controls. What the row actually says comes from the
 * renderer registered against its kind.
 *
 * The controls are standing rather than revealed on hover: there is no hover
 * on a phone, and these are the only way to read or file a notification.
 */
const NotificationItem = ({
    notification,
    onNavigate,
}: {
    notification: AppNotification;
    onNavigate: () => void;
}) => {
    const patch = usePatchNotification();
    const renderer = NOTIFICATION_RENDERERS[notification.kind];
    const { Leading } = renderer;

    // The registry is keyed by kind, so its content component takes exactly
    // the notification that selected it. TypeScript cannot follow the lookup.
    const Content = renderer.Content as ComponentType<
        ContentProps<AppNotification>
    >;

    const unread = notification.readAt === null;
    const archived = notification.archivedAt !== null;

    return (
        <li
            className={cn(
                /* pr-2 is the hit areas' doing: the action buttons grow
                   theirs 8px past the glyph, and anything less leaves the
                   list scrolling sideways. */
                "relative flex gap-3 rounded-md py-3 pr-2 pl-3 transition-colors",
                unread ? "bg-brand-subtle/50" : "hover:bg-surface-hover"
            )}
        >
            {unread && (
                <span
                    aria-hidden
                    className="absolute inset-y-2.5 left-0 w-0.5 rounded-full bg-brand"
                />
            )}

            {Leading ? (
                <Leading notification={notification as never} />
            ) : (
                <IconMark icon={renderer.icon} tone={renderer.tone} />
            )}

            <div className="min-w-0 flex-1">
                <Content notification={notification} onNavigate={onNavigate} />
                <time
                    dateTime={notification.createdAt}
                    className="mt-1 block text-label-sm text-content-muted"
                >
                    {relativeTime(notification.createdAt)}
                </time>
            </div>

            <div className="flex shrink-0 flex-col items-center gap-2 pt-0.5">
                <RowAction
                    icon={unread ? Circle : CircleCheck}
                    label={unread ? "Mark as read" : "Mark as unread"}
                    disabled={patch.isPending}
                    onClick={() =>
                        patch.mutate({
                            id: notification.id,
                            patch: { read: unread },
                        })
                    }
                />
                <RowAction
                    icon={archived ? ArchiveRestore : Archive}
                    label={archived ? "Move back to inbox" : "Archive"}
                    disabled={patch.isPending}
                    onClick={() =>
                        patch.mutate({
                            id: notification.id,
                            patch: { archived: !archived },
                        })
                    }
                />
            </div>
        </li>
    );
};

export default NotificationItem;
