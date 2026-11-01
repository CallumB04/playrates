import { afterEach, describe, expect, it, vi } from "vitest";

const save = vi.fn(async () => {});
const remove = vi.fn(async () => {});
vi.mock("../api", () => ({
    savePushSubscription: save,
    deletePushSubscription: remove,
}));

const { pushSubscription, pushSupported, turnOffPush, turnOnPush } =
    await import("./pushDevice");

const subscription = {
    endpoint: "https://push.example/1",
    toJSON: () => ({ keys: { p256dh: "p", auth: "a" } }),
    unsubscribe: vi.fn(async () => true),
};

/** A browser with a service worker, a push manager and an answer ready. */
const browser = (
    permission: NotificationPermission,
    existing: typeof subscription | null = null
) => {
    const pushManager = {
        getSubscription: vi.fn(async () => existing),
        subscribe: vi.fn(async () => subscription),
    };
    vi.stubGlobal("Notification", {
        requestPermission: vi.fn(async () => permission),
    });
    vi.stubGlobal("PushManager", function PushManager() {});
    Object.defineProperty(navigator, "serviceWorker", {
        configurable: true,
        value: { ready: Promise.resolve({ pushManager }) },
    });
    return pushManager;
};

afterEach(() => {
    vi.unstubAllGlobals();
    delete (navigator as { serviceWorker?: unknown }).serviceWorker;
    save.mockClear();
    remove.mockClear();
});

describe("push on this device", () => {
    it("isn't supported without a service worker", () => {
        expect(pushSupported()).toBe(false);
        browser("default");
        expect(pushSupported()).toBe(true);
    });

    it("asks, subscribes with the key, and tells the API", async () => {
        const manager = browser("granted");
        expect(await turnOnPush("AQID")).toBe("granted");
        expect(manager.subscribe).toHaveBeenCalledWith({
            userVisibleOnly: true,
            applicationServerKey: new Uint8Array([1, 2, 3]),
        });
        expect(save).toHaveBeenCalledWith({
            endpoint: "https://push.example/1",
            keys: { p256dh: "p", auth: "a" },
        });
    });

    it("subscribes to nothing when the answer is no", async () => {
        const manager = browser("denied");
        expect(await turnOnPush("AQID")).toBe("denied");
        expect(manager.subscribe).not.toHaveBeenCalled();
        expect(save).not.toHaveBeenCalled();
    });

    it("turns off what's there, and nothing when nothing is", async () => {
        browser("granted", subscription);
        expect(await pushSubscription()).toBe(subscription);
        await turnOffPush();
        expect(remove).toHaveBeenCalledWith("https://push.example/1");
        expect(subscription.unsubscribe).toHaveBeenCalled();

        browser("granted", null);
        await turnOffPush();
        expect(remove).toHaveBeenCalledOnce();
    });
});
