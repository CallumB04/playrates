import type {
    AppNotification,
    NotificationFeed,
    NotificationPatch,
} from "@playrates/shared";
import { api } from "../client";

/** The bell reads the inbox; `archived` switches it to the archive. */
export const fetchNotifications = async (
    archived: boolean,
    limit: number
): Promise<NotificationFeed> => {
    const { data } = await api.get<NotificationFeed>("/me/notifications", {
        params: { archived, limit },
    });
    return data;
};

export const patchNotification = async (
    id: number,
    patch: NotificationPatch
): Promise<AppNotification> => {
    const { data } = await api.patch<AppNotification>(
        `/me/notifications/${id}`,
        patch
    );
    return data;
};

export const markAllNotificationsRead = async (): Promise<void> => {
    await api.post("/me/notifications/read-all");
};
