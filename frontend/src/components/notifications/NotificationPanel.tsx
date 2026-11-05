import { useEffect, useMemo, useRef, useState } from "react";
import { TextSkeleton } from "../ui/Skeleton";
import {
    useArchiveAllNotifications,
    useMarkAllNotificationsRead,
    useMarkNotificationsSeen,
    useNotifications,
} from "../../hooks/queries/useNotifications";
import { awaitingAnswer } from "@playrates/shared";
import NotificationItem from "./NotificationItem";
import { feedSections } from "./notificationSections";

const HeaderAction = ({
    onClick,
    disabled,
    children,
}: {
    onClick: () => void;
    disabled: boolean;
    children: string;
}) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        /* The label stays small; the tap target does not. Padding would push
           the heading's baseline. */
        className="relative shrink-0 cursor-pointer rounded-sm text-label text-content-secondary transition-colors before:absolute before:-inset-x-2 before:-inset-y-3.5 before:content-[''] hover:text-brand-text disabled:cursor-not-allowed disabled:opacity-60"
    >
        {children}
    </button>
);

/**
 * The list itself, shared by the desktop popover and the mobile sheet: what
 * waits on an answer, what's new since the bell was last opened, then the
 * week and before. Closing it reads what it showed; anything done with is
 * cleared, not filed. Old ones expire on their own, so there's no archive
 * to keep.
 */
const NotificationPanel = ({
    onNavigate,
    titleId,
}: {
    /** Closes whichever shell is around it, when a row links away. */
    onNavigate: () => void;
    titleId: string;
}) => {
    const { data, isLoading } = useNotifications(false);
    const markAll = useMarkAllNotificationsRead();
    const clearAll = useArchiveAllNotifications();
    const markSeen = useMarkNotificationsSeen();

    // What counted as new when it opened. Marking it seen moves the server's
    // mark at once; the sections shouldn't move under the reader with it.
    const [seenAt, setSeenAt] = useState<string | null | undefined>(
        data ? (data.seenAt ?? null) : undefined
    );
    useEffect(() => {
        if (data && seenAt === undefined) setSeenAt(data.seenAt ?? null);
    }, [data, seenAt]);

    const unseen = data ? (data.unseen ?? data.unread) : 0;
    const { mutate: see } = markSeen;
    useEffect(() => {
        if (unseen > 0) see();
    }, [unseen, see]);

    const notifications = useMemo(() => data?.data ?? [], [data]);
    const sections = useMemo(
        () => feedSections(notifications, seenAt ?? null),
        [notifications, seenAt]
    );
    // Requests waiting on an answer stay unread, and out of both bulk
    // actions, until they are answered.
    const markable = (data?.unread ?? 0) - (data?.awaitingAnswer ?? 0);

    // Closing it reads what it showed: not every row has somewhere to open
    // (a welcome, an announcement with no link), and the badge should fall
    // to what still needs an answer. They stay marked new while it's open,
    // and one marked unread by hand while it was open stays unread.
    // A tick later, and only if it stayed closed: development mounts it
    // twice, and the first unmount would read everything on opening.
    const keptUnread = useRef(new Set<number>());
    const unreadShown = useRef<number[]>([]);
    unreadShown.current = notifications
        .filter((n) => n.readAt === null && !awaitingAnswer(n))
        .map((n) => n.id)
        .filter((id) => !keptUnread.current.has(id));
    const closed = useRef(false);
    const { mutate: readAll } = markAll;
    useEffect(() => {
        closed.current = false;
        return () => {
            closed.current = true;
            setTimeout(() => {
                if (closed.current && unreadShown.current.length > 0) {
                    readAll(unreadShown.current);
                }
            }, 0);
        };
    }, [readAll]);
    const onReadChange = (ids: number[], read: boolean) => {
        for (const id of ids) {
            if (read) keptUnread.current.delete(id);
            else keptUnread.current.add(id);
        }
    };
    const clearable = notifications.some((n) => !awaitingAnswer(n));

    return (
        <>
            {/* pr-11 clears the sheet's close control below `sm`; the popover
                renders no close button, so it reclaims the space. */}
            <div className="flex items-center justify-between gap-3 pr-11 sm:pr-0">
                <h2
                    id={titleId}
                    className="font-display text-lg font-semibold text-content"
                >
                    Notifications
                </h2>
                {/* Read first, then cleared: once nothing is left unread, the
                    same place empties the bell. */}
                {markable > 0 ? (
                    <HeaderAction
                        onClick={() => {
                            keptUnread.current.clear();
                            markAll.mutate(undefined);
                        }}
                        disabled={markAll.isPending}
                    >
                        Mark all read
                    </HeaderAction>
                ) : (
                    clearable && (
                        <HeaderAction
                            onClick={() => clearAll.mutate()}
                            disabled={clearAll.isPending}
                        >
                            Clear all
                        </HeaderAction>
                    )
                )}
            </div>

            <div className="mt-3 max-h-[64dvh] overflow-y-auto sm:max-h-[30rem]">
                {isLoading ? (
                    <div className="px-2 py-3">
                        <TextSkeleton lines={4} />
                    </div>
                ) : sections.length === 0 ? (
                    <p className="px-2 py-8 text-center text-body-sm text-content-muted">
                        You’re up to date.
                    </p>
                ) : (
                    sections.map((section) => (
                        <section
                            key={section.id}
                            aria-labelledby={`${titleId}-${section.id}`}
                            className="pb-2"
                        >
                            <h3
                                id={`${titleId}-${section.id}`}
                                className="px-3 pt-2 pb-1 text-label-sm font-medium text-content-muted"
                            >
                                {section.label}
                            </h3>
                            <ul className="flex flex-col gap-0.5">
                                {section.entries.map((entry) => (
                                    <NotificationItem
                                        key={entry.key}
                                        notification={entry.items[0]!}
                                        group={entry.items}
                                        onNavigate={onNavigate}
                                        onReadChange={onReadChange}
                                    />
                                ))}
                            </ul>
                        </section>
                    ))
                )}
            </div>
        </>
    );
};

export default NotificationPanel;
