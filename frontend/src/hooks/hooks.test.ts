import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDebouncedValue } from "./useDebouncedValue";
import { useScrollY } from "./useScrollY";
import { useWindowSize } from "./useWindowSize";

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
