import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
    awaitingAnswer,
    type AppNotification,
    type NotificationFeed,
    type NotificationPatch,
} from "@playrates/shared";
import {
    markAllNotificationsRead,
    markNotificationsSeen,
    patchNotification,
    patchNotifications,
    queryKeys,
} from "../../api";
import { useNotify } from "../../contexts/NotificationContext";

/* Apart from useNotifications, which the bell needs on every page: these
   only once it's opened, so they load with the panel. */

/** Every mutation invalidates both lists: archiving moves a row between them. */
const useNotificationsInvalidator = () => {
    const queryClient = useQueryClient();
    return () =>
        queryClient.invalidateQueries({
            queryKey: queryKeys.notifications.all,
        });
};

export const usePatchNotification = () => {
    const invalidate = useNotificationsInvalidator();
    return useMutation({
        mutationFn: ({ id, patch }: { id: number; patch: NotificationPatch }) =>
            patchNotification(id, patch),
        onSuccess: invalidate,
    });
};

/** Opening the bell clears its badge at once, rather than at the next poll. */
export const useMarkNotificationsSeen = () => {
    const queryClient = useQueryClient();
    const invalidate = useNotificationsInvalidator();
    return useMutation({
        mutationFn: markNotificationsSeen,
        onMutate: () =>
            queryClient.setQueryData<NotificationFeed>(
                queryKeys.notifications.list(false),
                (feed) => feed && { ...feed, unseen: 0 }
            ),
        onSettled: invalidate,
    });
};

/**
 * Clears rows, one, a group or all of them: gone from the bell at once,
 * read as they go, with Undo rather than a question first. `label` is what
 * the toast says was cleared. Undo puts each back as it was, unread if it
 * was.
 */
export const useClearNotifications = () => {
    const queryClient = useQueryClient();
    const invalidate = useNotificationsInvalidator();
    const notify = useNotify();
    const key = queryKeys.notifications.list(false);

    return useMutation({
        mutationFn: ({
            items,
        }: {
            items: AppNotification[];
            label: ReactNode;
        }) =>
            patchNotifications(
                items.map((n) => n.id),
                { archived: true }
            ),
        onMutate: ({ items }) => {
            const before = queryClient.getQueryData<NotificationFeed>(key);
            const gone = new Set(items.map((n) => n.id));
            queryClient.setQueryData<NotificationFeed>(
                key,
                (feed) =>
                    feed && {
                        ...feed,
                        data: feed.data.filter((n) => !gone.has(n.id)),
                    }
            );
            return { before };
        },
        onError: (_error, _vars, context) => {
            queryClient.setQueryData(key, context?.before);
            notify("That didn’t clear. Try again.", "error");
        },
        onSuccess: (_result, { items, label }) => {
            const ids = (read: boolean) =>
                items
                    .filter((n) => (n.readAt !== null) === read)
                    .map((n) => n.id);
            notify(label, "info", "low", {
                label: "Undo",
                // Long enough to notice and reach for, then gone.
                dwell: 10_000,
                onClick: () =>
                    void Promise.all(
                        [true, false]
                            .filter((read) => ids(read).length > 0)
                            .map((read) =>
                                patchNotifications(ids(read), {
                                    archived: false,
                                    read,
                                })
                            )
                    ).then(invalidate),
            });
        },
        onSettled: invalidate,
    });
};

/** Sets rows read or unread in the cached feed, and the badge with them,
 *  so the bell answers at once rather than at the next poll. */
const useSetReadInCache = () => {
    const queryClient = useQueryClient();
    return (pick: (n: AppNotification) => boolean, read: boolean) => {
        const now = new Date().toISOString();
        queryClient.setQueryData<NotificationFeed>(
            queryKeys.notifications.list(false),
            (feed) => {
                if (!feed) return feed;
                let change = 0;
                const data = feed.data.map((n) => {
                    if (!pick(n) || awaitingAnswer(n)) return n;
                    if (read === (n.readAt !== null)) return n;
                    change += read ? -1 : 1;
                    return { ...n, readAt: read ? now : null };
                });
                // The rows' count is the server's to work out; until it
                // does, the badge reads the plain count, moved at once.
                return {
                    ...feed,
                    data,
                    unread: feed.unread + change,
                    unreadRows: undefined,
                };
            }
        );
    };
};

/** Everything unread, or only the rows named: closing the bell reads what
 *  it showed, less any marked unread while it was open. */
export const useMarkAllNotificationsRead = () => {
    const setRead = useSetReadInCache();
    const invalidate = useNotificationsInvalidator();
    return useMutation({
        mutationFn: (ids?: number[]) => markAllNotificationsRead(ids),
        onMutate: (ids) => setRead((n) => !ids || ids.includes(n.id), true),
        onSettled: invalidate,
    });
};

/** A row, or a group of them, read or unread again by hand. */
export const useSetNotificationsRead = () => {
    const setRead = useSetReadInCache();
    const invalidate = useNotificationsInvalidator();
    return useMutation({
        mutationFn: ({
            items,
            read,
        }: {
            items: AppNotification[];
            read: boolean;
        }) =>
            patchNotifications(
                items.map((n) => n.id),
                { read }
            ),
        onMutate: ({ items, read }) => {
            const ids = new Set(items.map((n) => n.id));
            setRead((n) => ids.has(n.id), read);
        },
        onSettled: invalidate,
    });
};
