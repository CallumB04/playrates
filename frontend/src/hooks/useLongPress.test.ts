import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { PointerEvent } from "react";
import { HOLD_MS, useLongPress } from "./useLongPress";

const pointer = (pointerType: string, x = 0, y = 0) =>
    ({ pointerType, clientX: x, clientY: y }) as unknown as PointerEvent;

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useLongPress", () => {
    it("holds once a finger rests long enough, and swallows the click after", () => {
        const onHold = vi.fn();
        const { result } = renderHook(() => useLongPress(onHold));
        act(() => result.current.handlers.onPointerDown(pointer("touch")));
        expect(result.current.pressing).toBe(true);

        act(() => vi.advanceTimersByTime(HOLD_MS));
        expect(onHold).toHaveBeenCalledOnce();
        expect(result.current.pressing).toBe(false);
        expect(result.current.consumeHold()).toBe(true);
        // Only the one click.
        expect(result.current.consumeHold()).toBe(false);
    });

    it("is a tap when the finger lifts too soon", () => {
        const onHold = vi.fn();
        const { result } = renderHook(() => useLongPress(onHold));
        act(() => result.current.handlers.onPointerDown(pointer("touch")));
        act(() => result.current.handlers.onPointerUp());
        act(() => vi.advanceTimersByTime(HOLD_MS));
        expect(onHold).not.toHaveBeenCalled();
        expect(result.current.consumeHold()).toBe(false);
    });

    it("lets a finger that moves scroll instead", () => {
        const onHold = vi.fn();
        const { result } = renderHook(() => useLongPress(onHold));
        act(() => result.current.handlers.onPointerDown(pointer("touch")));
        act(() =>
            result.current.handlers.onPointerMove(pointer("touch", 0, 30))
        );
        act(() => vi.advanceTimersByTime(HOLD_MS));
        expect(onHold).not.toHaveBeenCalled();
    });

    it("leaves a mouse to its own controls", () => {
        const onHold = vi.fn();
        const { result } = renderHook(() => useLongPress(onHold));
        act(() => result.current.handlers.onPointerDown(pointer("mouse")));
        act(() => vi.advanceTimersByTime(HOLD_MS));
        expect(onHold).not.toHaveBeenCalled();
    });
});
