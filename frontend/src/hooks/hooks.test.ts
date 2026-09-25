import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDebouncedValue } from "./useDebouncedValue";
import { useScrollY } from "./useScrollY";
import { useWindowSize } from "./useWindowSize";
import { usePageTitle } from "./usePageTitle";
import { BREAKPOINT, useMediaQuery } from "./useMediaQuery";
import { useDismiss } from "./useDismiss";

describe("useDebouncedValue", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("returns the initial value straight away", () => {
        const { result } = renderHook(() => useDebouncedValue("hollow", 300));
        expect(result.current).toBe("hollow");
    });

    it("holds the old value until the delay has passed", () => {
        const { result, rerender } = renderHook(
            ({ value }) => useDebouncedValue(value, 300),
            { initialProps: { value: "h" } }
        );

        rerender({ value: "hollow" });
        expect(result.current).toBe("h");

        act(() => vi.advanceTimersByTime(299));
        expect(result.current).toBe("h");

        act(() => vi.advanceTimersByTime(1));
        expect(result.current).toBe("hollow");
    });

    it("only emits the last value of a burst", () => {
        const { result, rerender } = renderHook(
            ({ value }) => useDebouncedValue(value, 300),
            { initialProps: { value: "" } }
        );

        for (const value of ["h", "ho", "hol"]) {
            rerender({ value });
            act(() => vi.advanceTimersByTime(100));
        }
        expect(result.current).toBe("");

        act(() => vi.advanceTimersByTime(300));
        expect(result.current).toBe("hol");
    });

    it("drops the pending value when it is unmounted mid-flight", () => {
        const { unmount, rerender } = renderHook(
            ({ value }) => useDebouncedValue(value, 300),
            { initialProps: { value: "a" } }
        );
        rerender({ value: "b" });
        unmount();
        expect(() => vi.runAllTimers()).not.toThrow();
    });
});

/* jsdom fires neither of these on its own, so the events are dispatched by
   hand and rAF is driven by the fake clock. */
describe("useScrollY", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => {
        vi.useRealTimers();
        window.scrollY = 0;
    });

    it("starts at the current offset", () => {
        window.scrollY = 120;
        const { result } = renderHook(() => useScrollY());
        expect(result.current).toBe(120);
    });

    it("follows a scroll once the frame runs", () => {
        const { result } = renderHook(() => useScrollY());

        act(() => {
            window.scrollY = 480;
            window.dispatchEvent(new Event("scroll"));
            vi.advanceTimersByTime(32);
        });
        expect(result.current).toBe(480);
    });

    it("collapses a burst of events into one update", () => {
        const { result } = renderHook(() => useScrollY());

        act(() => {
            for (const y of [100, 200, 300]) {
                window.scrollY = y;
                window.dispatchEvent(new Event("scroll"));
            }
            vi.advanceTimersByTime(32);
        });
        expect(result.current).toBe(300);
    });

    it("stops listening once unmounted", () => {
        const { result, unmount } = renderHook(() => useScrollY());
        unmount();

        act(() => {
            window.scrollY = 900;
            window.dispatchEvent(new Event("scroll"));
            vi.advanceTimersByTime(32);
        });
        expect(result.current).toBe(0);
    });
});

describe("useWindowSize", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("starts at the current viewport", () => {
        const { result } = renderHook(() => useWindowSize());
        expect(result.current).toEqual({
            width: window.innerWidth,
            height: window.innerHeight,
        });
    });

    it("follows a resize once the frame runs", () => {
        const { result } = renderHook(() => useWindowSize());

        act(() => {
            window.innerWidth = 390;
            window.innerHeight = 844;
            window.dispatchEvent(new Event("resize"));
            vi.advanceTimersByTime(32);
        });
        expect(result.current).toEqual({ width: 390, height: 844 });
    });
});

describe("usePageTitle", () => {
    const DEFAULT = "PlayRates / Video Game Tracker";

    it("names the tab after the page", () => {
        renderHook(() => usePageTitle("Library"));
        expect(document.title).toBe("Library / PlayRates");
    });

    it("falls back to the site title with no page name", () => {
        renderHook(() => usePageTitle());
        expect(document.title).toBe(DEFAULT);
    });

    it("falls back while a name is still loading", () => {
        const { rerender } = renderHook(
            ({ name }: { name?: string }) => usePageTitle(name),
            { initialProps: {} as { name?: string } }
        );
        expect(document.title).toBe(DEFAULT);

        rerender({ name: "Hollow Knight" });
        expect(document.title).toBe("Hollow Knight / PlayRates");
    });

    it("restores the site title when the page goes away", () => {
        const { unmount } = renderHook(() => usePageTitle("Settings"));
        unmount();
        expect(document.title).toBe(DEFAULT);
    });
});

/** A matchMedia that can be flipped from the test, the way a resize would. */
const controllableMedia = (initial: boolean) => {
    let matches = initial;
    const listeners = new Set<() => void>();
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
        get matches() {
            return matches;
        },
        media: query,
        addEventListener: (_: string, fn: () => void) => listeners.add(fn),
        removeEventListener: (_: string, fn: () => void) =>
            listeners.delete(fn),
    })) as unknown as typeof window.matchMedia;

    return {
        set: (next: boolean) => {
            matches = next;
            listeners.forEach((fn) => fn());
        },
        listeners,
        restore: () => {
            window.matchMedia = original;
        },
    };
};

describe("useMediaQuery", () => {
    it("answers with whether the query matches now", () => {
        const media = controllableMedia(true);
        const { result } = renderHook(() => useMediaQuery(BREAKPOINT.sm));
        expect(result.current).toBe(true);
        media.restore();
    });

    /* The header closes its mobile menu on the way up past lg; that only
       works if the answer changes while the component is mounted. */
    it("follows the query as it changes", () => {
        const media = controllableMedia(false);
        const { result } = renderHook(() => useMediaQuery(BREAKPOINT.lg));

        act(() => media.set(true));
        expect(result.current).toBe(true);

        act(() => media.set(false));
        expect(result.current).toBe(false);
        media.restore();
    });

    it("stops listening once unmounted", () => {
        const media = controllableMedia(false);
        const { unmount } = renderHook(() => useMediaQuery(BREAKPOINT.xl));
        expect(media.listeners.size).toBe(1);

        unmount();
        expect(media.listeners.size).toBe(0);
        media.restore();
    });
});

describe("useDismiss", () => {
    const setup = (enabled: boolean, escape = false) => {
        const inside = document.createElement("div");
        const outside = document.createElement("div");
        document.body.append(inside, outside);
        const onDismiss = vi.fn();
        const { unmount } = renderHook(() =>
            useDismiss([{ current: inside }], onDismiss, { enabled, escape })
        );
        const cleanup = () => {
            unmount();
            inside.remove();
            outside.remove();
        };
        return { inside, outside, onDismiss, cleanup };
    };

    it("dismisses on a press outside, and not on one inside", () => {
        const { inside, outside, onDismiss, cleanup } = setup(true);

        inside.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
        expect(onDismiss).not.toHaveBeenCalled();

        outside.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
        expect(onDismiss).toHaveBeenCalledTimes(1);
        cleanup();
    });

    it("does nothing while disabled", () => {
        const { outside, onDismiss, cleanup } = setup(false);

        outside.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
        expect(onDismiss).not.toHaveBeenCalled();
        cleanup();
    });

    /* Off by default: the dropdown handles Escape itself, and a second
       listener would close the modal it sits in as well. */
    it("leaves Escape alone unless asked", () => {
        const plain = setup(true);
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
        expect(plain.onDismiss).not.toHaveBeenCalled();
        plain.cleanup();

        const withEscape = setup(true, true);
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
        expect(withEscape.onDismiss).toHaveBeenCalledTimes(1);
        withEscape.cleanup();
    });
});
