import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { server } from "./msw/server";

// env is read at module load; tests never reach a real Supabase project
vi.stubEnv("VITE_API_BASE_URL", "http://localhost:3000");
vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
vi.stubEnv("VITE_SUPABASE_ANON_KEY", "test-anon-key");

/**
 * The API client attaches a token from supabase.auth.getSession(). Stubbing
 * the module keeps tests off the network while still exercising the real
 * interceptor, so the Authorization header is genuinely covered.
 */
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
