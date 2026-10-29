import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { cleanup, configure } from "@testing-library/react";
import { server } from "./msw/server";

// env is read at module load; tests never reach a real Supabase project
vi.stubEnv("VITE_API_BASE_URL", "http://localhost:3000");
vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
vi.stubEnv("VITE_SUPABASE_ANON_KEY", "test-anon-key");
// Off unless a test asks for it, whatever the developer's .env holds.
vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "");

/** Stubbing the supabase module keeps tests off the network while the real
 *  interceptor still runs, so the Authorization header stays covered. */
vi.mock("../lib/supabase", () => ({
    supabase: {
        auth: {
            getSession: vi.fn(async () => ({
                data: { session: { access_token: "test-access-token" } },
            })),
            signInWithPassword: vi.fn(async () => ({ error: null })),
            signUp: vi.fn(async () => ({ error: null })),
            signOut: vi.fn(async () => ({ error: null })),
            onAuthStateChange: vi.fn(() => ({
                data: { subscription: { unsubscribe: vi.fn() } },
            })),
        },
    },
}));

/* findBy and waitFor give up after 1s by default. A mocked request and a
   first render take a fraction of that alone, but not on a full run across
   every core; like vitest.config's testTimeout, this is a hang detector. */
configure({ asyncUtilTimeout: 5_000 });

// jsdom has no layout, so nothing can be scrolled into view
Element.prototype.scrollIntoView ??= vi.fn();

// jsdom implements neither, and both are used by the hooks
if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;
}

// jsdom has no layout to observe; a test that needs a resize stubs its own
window.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
};

if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = ((cb: FrameRequestCallback) =>
        setTimeout(
            () => cb(performance.now()),
            0
        ) as unknown as number) as typeof window.requestAnimationFrame;
    window.cancelAnimationFrame = ((id: number) =>
        clearTimeout(id)) as typeof window.cancelAnimationFrame;
}

// "error" so a request with no handler fails the test loudly rather than
// silently hitting the network
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
    server.resetHandlers();
    cleanup();
    // jsdom does not always provide localStorage under Node 26; the app
    // guards its own access to it, so tests do the same here
    window.localStorage?.clear?.();
});
afterAll(() => server.close());
