import type { ComponentType } from "react";
import { X } from "lucide-react";
import IconMark from "./IconMark";
import {
    awaitingAnswer,
    type AppNotification,
    type CommunityReplyNotification,
    type FriendAcceptedNotification,
} from "@playrates/shared";
import {
    useClearNotifications,
    useSetNotificationsRead,
} from "../../hooks/queries/useNotificationActions";
import { relativeTime } from "../../lib/format";
import { cn } from "../../lib/cn";
import { NOTIFICATION_RENDERERS, type ContentProps } from "./registry";
import { ANNOUNCEMENT_PRESENTATION } from "./announcementTones";
import { NOTIFICATION_TONES } from "./notificationTones";
import {
    AcceptedGroupContent,
    FacePair,
    ReplyGroupContent,
} from "./GroupContents";
import { useRowSwipe } from "./useRowSwipe";
import ClearedLine from "./ClearedLine";
import { summaryOf } from "./notificationSummary";

/**
 * The shell every notification shares: mark, timestamp, unread dot and the
 * one control there is, Clear. What the row says comes from the renderer
 * registered against its kind, or for several of a kind on one day, from
 * the group's own wording.
 *
 * Opening a row reads it, so there's no read button; clearing reads it too.
 * Clear is standing rather than revealed on hover, as a phone has no hover,
 * and a phone can swipe the row away as well.
 */
const NotificationItem = ({
    notification,
    group,
    onNavigate,
    onReadChange,
    preview = false,
}: {
    /** The newest, where it heads a group. */
    notification: AppNotification;
    /** Every notification in the row, newest first, where there are several. */
    group?: AppNotification[];
    onNavigate: () => void;
    /** Told when the row is read or unread by hand, so closing the bell
     *  leaves one marked unread as it is. */
    onReadChange?: (ids: number[], read: boolean) => void;
    /** A row that isn't in anyone's inbox yet, for the announcement composer:
     *  laid out exactly as the bell has it, with nothing to act on. */
    preview?: boolean;
}) => {
    const clear = useClearNotifications();
    const setRead = useSetNotificationsRead();
    const items = group && group.length > 1 ? group : [notification];
    const renderer = NOTIFICATION_RENDERERS[notification.kind];

    const unread = items.some((n) => n.readAt === null);
    // Its Accept and Decline are the way out; it stays until then.
    const task = awaitingAnswer(notification);
    const clearRow = () =>
        clear.mutate({
            items,
            label: <ClearedLine what={summaryOf(items)} />,
        });
    const toggleRead = () => {
        setRead.mutate({ items, read: unread });
        onReadChange?.(
            items.map((n) => n.id),
            unread
        );
    };
    const swipe = useRowSwipe({
        onLeft: () => clearRow(),
        onRight: toggleRead,
        enabled: !task && !preview,
    });
    const tone =
        NOTIFICATION_TONES[
            notification.kind === "announcement"
                ? ANNOUNCEMENT_PRESENTATION[notification.tone].tone
                : renderer.tone
        ];

    // The registry is keyed by kind, so its content component takes exactly
    // the notification that selected it. TypeScript cannot follow the lookup.
    const Content = renderer.Content as ComponentType<
        ContentProps<AppNotification>
    >;
    const { Leading } = renderer;

    const body =
        items.length > 1 && notification.kind === "friend_accepted" ? (
            <AcceptedGroupContent
                items={items as FriendAcceptedNotification[]}
                onNavigate={onNavigate}
            />
        ) : items.length > 1 && notification.kind === "community_reply" ? (
            <ReplyGroupContent
                items={items as CommunityReplyNotification[]}
                onNavigate={onNavigate}
            />
        ) : (
            <Content notification={notification} onNavigate={onNavigate} />
        );

    const leading =
        items.length > 1 &&
        (notification.kind === "friend_accepted" ||
            notification.kind === "community_reply") ? (
            <FacePair
                actors={(
                    items as (
                        FriendAcceptedNotification | CommunityReplyNotification
                    )[]
                ).map((n) => n.actor)}
            />
        ) : Leading ? (
            <Leading notification={notification as never} />
        ) : (
            <IconMark icon={renderer.icon} tone={renderer.tone} />
        );

    return (
        <li
            className="relative touch-pan-y overflow-hidden rounded-md"
            {...swipe.handlers}
        >
            {swipe.offset < -16 && (
                <span
                    aria-hidden
                    className="absolute inset-y-0 right-4 flex items-center text-label font-medium text-content-secondary"
                >
                    Clear
                </span>
            )}
            {swipe.offset > 16 && (
                <span
                    aria-hidden
                    className="absolute inset-y-0 left-4 flex items-center text-label font-medium text-content-secondary"
                >
                    {unread ? "Mark as read" : "Mark as unread"}
                </span>
            )}
            <div
                style={
                    swipe.offset
                        ? { transform: `translateX(${swipe.offset}px)` }
                        : undefined
                }
                className={cn(
                    /* pr-2 is the hit area's doing: the Clear button grows
                       its own 8px past the glyph, and anything less leaves
                       the list scrolling sideways. pl-7 leaves the dot its
                       margin, clear of the mark. */
                    "relative flex gap-3 rounded-md py-3 pr-2 pl-7 transition-colors",
                    // Three signs at once, so it reads as new at a glance:
                    // a wash in its mark's colour, a dot and heavier names.
                    unread
                        ? cn("notification-unread", tone.wash)
                        : "notification-read hover:bg-surface-hover"
                )}
            >
                {/* In the margin, level with the mark, where Mail and
                    Messages put theirs: beside the controls it read as one.
                    It's the toggle as well: the dot reads the row, and a
                    faint ring in its place on a read one unreads it. A
                    request waiting on an answer can't be read by hand. */}
                {task ? (
                    <span
                        aria-hidden
                        className={cn(
                            "absolute top-[1.6875rem] left-2.5 size-2.5 rounded-full",
                            tone.dot
                        )}
                    />
                ) : (
                    <button
                        type="button"
                        title={unread ? "Mark as read" : "Mark as unread"}
                        aria-label={unread ? "Mark as read" : "Mark as unread"}
                        disabled={preview || setRead.isPending}
                        onClick={toggleRead}
                        className={cn(
                            "group/dot absolute top-[1.375rem] left-1.5 grid size-5 cursor-pointer place-items-center rounded-full",
                            // 44px tall to tap, and as wide as the margin.
                            "before:absolute before:-inset-x-1.5 before:-inset-y-3 before:content-['']",
                            "focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-default"
                        )}
                    >
                        <span
                            className={cn(
                                "size-2.5 rounded-full transition-colors",
                                unread
                                    ? tone.dot
                                    : "border border-strong group-hover/dot:border-content-muted"
                            )}
                        />
                    </button>
                )}
                {leading}

                <div className="min-w-0 flex-1">
                    {body}
                    <time
                        dateTime={notification.createdAt}
                        className="mt-1 block text-label-sm text-content-muted"
                    >
                        {relativeTime(notification.createdAt)}
                    </time>
                </div>

                <div className="flex shrink-0 flex-col items-center pt-0.5">
                    {!task && (
                        <button
                            type="button"
                            title="Clear"
                            aria-label="Clear"
                            disabled={preview || clear.isPending}
                            onClick={clearRow}
                            className={cn(
                                "relative flex size-8 cursor-pointer items-center justify-center rounded-sm text-content-muted transition-colors",
                                "before:absolute before:-inset-2 before:content-[''] hover:bg-surface-hover hover:text-content",
                                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                                "disabled:cursor-not-allowed disabled:opacity-50"
                            )}
                        >
                            <X size={15} aria-hidden />
                        </button>
                    )}
                    {unread && <span className="sr-only">Unread</span>}
                </div>
            </div>
        </li>
    );
};

export default NotificationItem;
