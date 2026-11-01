import { deletePushSubscription, savePushSubscription } from "../api";

/** A VAPID key as the push manager wants it: URL-safe base64 to bytes. */
export const keyBytes = (key: string): Uint8Array<ArrayBuffer> => {
    const base64 = (key + "=".repeat((4 - (key.length % 4)) % 4))
        .replace(/-/g, "+")
        .replace(/_/g, "/");
    const raw = atob(base64);
    return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

export const pushSupported = (): boolean =>
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

/* Ready never settles where the worker didn't register, a private window
   in some browsers among them. */
const worker = (): Promise<ServiceWorkerRegistration> =>
    Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("No service worker")), 5000)
        ),
    ]);

export const pushSubscription = async (): Promise<PushSubscription | null> =>
    (await worker()).pushManager.getSubscription();

/** Asks, then subscribes and tells the API. What the browser said. */
export const turnOnPush = async (
    publicKey: string
): Promise<NotificationPermission> => {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return permission;
    const subscription = await (
        await worker()
    ).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes(publicKey),
    });
    const json = subscription.toJSON();
    await savePushSubscription({
        endpoint: subscription.endpoint,
        keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
    });
    return permission;
};

export const turnOffPush = async (): Promise<void> => {
    const subscription = await pushSubscription();
    if (!subscription) return;
    await deletePushSubscription(subscription.endpoint);
    await subscription.unsubscribe();
};
