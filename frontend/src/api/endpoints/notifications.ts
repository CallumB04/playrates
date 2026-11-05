import type {
    AppNotification,
    NotificationFeed,
    NotificationPatch,
    PushSubscriptionInput,
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

/** The bell was opened: the badge counts from here. */
export const markNotificationsSeen = async (): Promise<void> => {
    await api.post("/me/notifications/seen");
};

/** Everything, or only these where given. */
export const markAllNotificationsRead = async (
    ids?: number[]
): Promise<void> => {
    await api.post("/me/notifications/read-all", ids ? { ids } : undefined);
};

/** Files away every read notification in the inbox. */
export const archiveAllNotifications = async (): Promise<void> => {
    await api.post("/me/notifications/archive-all");
};

/** Null where push isn't set up, so nothing offers it. */
export const fetchPushKey = async (): Promise<string | null> =>
    (
        await api.get<{ publicKey: string | null }>("/push/key", {
            anonymous: true,
        })
    ).data.publicKey;

export const savePushSubscription = async (
    input: PushSubscriptionInput
): Promise<void> => {
    await api.post("/me/push", input);
};

export const deletePushSubscription = async (
    endpoint: string
): Promise<void> => {
    await api.post("/me/push/remove", { endpoint });
};
