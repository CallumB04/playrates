import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NotificationPatch } from "@playrates/shared";
import {
    fetchNotifications,
    markAllNotificationsRead,
    patchNotification,
    queryKeys,
} from "../../api";
import { useAuth } from "../../contexts/AuthContext";

/** As many as the menu shows at once. Paging can come with a full page. */
const MENU_LIMIT = 20;

/** The inbox query is mounted for as long as the bell is, so its unread count
 *  is what the badge reads. Polled, because a friend request arrives without
 *  anything on this tab happening. */
export const useNotifications = (archived: boolean, enabled = true) => {
    const { user } = useAuth();
    return useQuery({
        queryKey: queryKeys.notifications.list(archived),
        queryFn: () => fetchNotifications(archived, MENU_LIMIT),
        enabled: !!user && enabled,
        staleTime: 30_000,
        refetchInterval: 60_000,
    });
};

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

export const useMarkAllNotificationsRead = () => {
    const invalidate = useNotificationsInvalidator();
    return useMutation({
        mutationFn: markAllNotificationsRead,
        onSuccess: invalidate,
    });
};
