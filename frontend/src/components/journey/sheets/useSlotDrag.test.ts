import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, renderHook } from "@testing-library/react";
import type { PointerEvent } from "react";
import { TOUCH_HOLD_MS, useSlotDrag } from "./useSlotDrag";

const slot = (n: number) => {
    const el = document.createElement("div");
    el.dataset.slot = String(n);
    return el;
};
const down = (pointerType: string) =>
    ({ button: 0, pointerType, clientX: 0, clientY: 0 }) as PointerEvent;
const touch = (x: number) => ({ touches: [{ clientX: x, clientY: 0 }] });

let original: typeof document.elementFromPoint;
beforeEach(() => {
    vi.useFakeTimers();
    original = document.elementFromPoint;
    document.elementFromPoint = () => slot(3);
});
afterEach(() => {
    vi.useRealTimers();
    document.elementFromPoint = original;
});

describe("useSlotDrag", () => {
    it("picks a cover up by finger once held, and drops it where it's let go", () => {
        const onSwap = vi.fn();
        const { result } = renderHook(() => useSlotDrag(onSwap));
        act(() => result.current.start(0, down("touch")));
        act(() => vi.advanceTimersByTime(TOUCH_HOLD_MS));
        expect(result.current.drag?.from).toBe(0);

        act(() => {
            fireEvent.touchMove(window, touch(60));
        });
        expect(result.current.drag?.over).toBe(3);
        act(() => {
            fireEvent.touchEnd(window);
        });
        expect(onSwap).toHaveBeenCalledWith(0, 3);
        // The click that ends it doesn't also choose the place.
        expect(result.current.consumeDrag()).toBe(true);
    });

    it("leaves a finger that moves straight away to scroll", () => {
        const onSwap = vi.fn();
        const { result } = renderHook(() => useSlotDrag(onSwap));
        act(() => result.current.start(0, down("touch")));
        act(() => {
            fireEvent.touchMove(window, touch(30));
        });
        act(() => vi.advanceTimersByTime(TOUCH_HOLD_MS));
        expect(result.current.drag).toBeNull();
        expect(result.current.consumeDrag()).toBe(false);
    });

    it("is a click, not a drag, when a mouse doesn't move", () => {
        const onSwap = vi.fn();
        const { result } = renderHook(() => useSlotDrag(onSwap));
        act(() => result.current.start(0, down("mouse")));
        act(() => {
            fireEvent.pointerUp(window, { pointerType: "mouse" });
        });
        expect(onSwap).not.toHaveBeenCalled();
        expect(result.current.consumeDrag()).toBe(false);
    });
});
