import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useExit } from "./useExit";

const holding = (el: HTMLElement | null) => ({ current: el });

afterEach(() => vi.useRealTimers());

describe("useExit", () => {
    it("goes at once when there is no exit to play", () => {
        const done = vi.fn();
        const { result } = renderHook(() =>
            useExit(holding(document.createElement("div")))
        );
        act(() => result.current.leave(done));
        expect(done).toHaveBeenCalledOnce();
        expect(result.current.leaving).toBe(false);
    });

    it("plays the exit out before going, and goes once however often asked", () => {
        vi.useFakeTimers();
        const done = vi.fn();
        const el = document.createElement("div");
        el.style.setProperty("--exit-ms", "150");
        const ref = holding(el);
        const { result } = renderHook(() => useExit(ref));

        act(() => {
            result.current.leave(done);
            result.current.leave(done);
        });
        expect(result.current.leaving).toBe(true);
        expect(done).not.toHaveBeenCalled();

        act(() => vi.advanceTimersByTime(150));
        expect(done).toHaveBeenCalledOnce();
        expect(result.current.leaving).toBe(false);
    });
});
