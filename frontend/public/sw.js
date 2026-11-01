/*
 * PlayRates' service worker. Three jobs, and no caching of the app itself:
 * pages and code always come from the network, so a deploy is never held
 * back by a stale copy here.
 *
 * - A page that can't load offline gets the offline page instead of the
 *   browser's error.
 * - A push shows as a notification.
 * - Tapping one opens the page it's about, in a tab already open if there
 *   is one.
 */

const OFFLINE_CACHE = "playrates-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches
            .open(OFFLINE_CACHE)
            .then((cache) =>
                cache.add(new Request(OFFLINE_URL, { cache: "reload" }))
            )
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter((key) => key !== OFFLINE_CACHE)
                        .map((key) => caches.delete(key))
                )
            )
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    if (event.request.mode !== "navigate") return;
    event.respondWith(
        fetch(event.request).catch(() => caches.match(OFFLINE_URL))
    );
});

self.addEventListener("push", (event) => {
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch {
        // A push we can't read still says something arrived.
    }
    event.waitUntil(
        self.registration.showNotification(data.title || "PlayRates", {
            body: data.body || "",
            icon: "/icon-192.png",
            tag: data.tag,
            data: { url: data.url || "/" },
        })
    );
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const url = new URL(
        event.notification.data?.url || "/",
        self.location.origin
    );
    // Only ever our own pages, whatever the push said.
    const target =
        url.origin === self.location.origin ? url.href : self.location.origin;
    event.waitUntil(
        self.clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then((windows) => {
                const open = windows.find((w) =>
                    w.url.startsWith(self.location.origin)
                );
                if (open)
                    return open
                        .navigate(target)
                        .then((w) => (w || open).focus());
                return self.clients.openWindow(target);
            })
    );
});
