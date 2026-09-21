import { act, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Figure, { useFigureRoll } from "./Figure";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";

/** Drives rAF off the fake clock, so a roll can be stepped frame by frame. */
const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

const matchMedia = (matches: boolean) =>
    vi.fn().mockImplementation((query: string) => ({
        matches,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
    }));

describe("usePrefersReducedMotion", () => {
    const original = window.matchMedia;
    afterEach(() => {
        window.matchMedia = original;
    });

    it("is false when the user has expressed no preference", () => {
        window.matchMedia = matchMedia(false);
        expect(renderHook(() => usePrefersReducedMotion()).result.current).toBe(
            false
        );
    });

    it("is true when the query matches", () => {
        window.matchMedia = matchMedia(true);
        expect(renderHook(() => usePrefersReducedMotion()).result.current).toBe(
            true
        );
    });
});

describe("useFigureRoll", () => {
    const original = window.matchMedia;

    beforeEach(() => {
        /* performance too, or the hook's start time and the rAF callback
           timestamp sit on two different clocks. */
        vi.useFakeTimers({
            toFake: [
                "requestAnimationFrame",
                "cancelAnimationFrame",
                "performance",
            ],
        });
        window.matchMedia = matchMedia(false);
    });
    afterEach(() => {
        vi.useRealTimers();
        window.matchMedia = original;
    });

    it("starts at the target rather than counting up from zero on mount", () => {
        const { result } = renderHook(() => useFigureRoll(1284, true));
        expect(result.current).toBe(1284);
    });

    it("lands exactly on the new target once the roll finishes", () => {
        const { result, rerender } = renderHook(
            ({ target }) => useFigureRoll(target, true),
            { initialProps: { target: 0 } }
        );

        rerender({ target: 100 });
        advance(160);
        expect(result.current).toBeGreaterThan(0);
        expect(result.current).toBeLessThan(100);

        advance(400);
        expect(result.current).toBe(100);
    });

    it("swaps straight to the target when the roll is switched off", () => {
        const { result, rerender } = renderHook(
            ({ target }) => useFigureRoll(target, false),
            { initialProps: { target: 0 } }
        );

        rerender({ target: 100 });
        expect(result.current).toBe(100);
    });

    it("swaps straight to the target under reduced motion", () => {
        window.matchMedia = matchMedia(true);
        const { result, rerender } = renderHook(
            ({ target }) => useFigureRoll(target, true),
            { initialProps: { target: 0 } }
        );

        rerender({ target: 100 });
        expect(result.current).toBe(100);
    });
});

describe("Figure", () => {
    it("groups thousands by default", () => {
        render(<Figure value={184662} />);
        expect(screen.getByText("184,662")).toBeInTheDocument();
    });

    it("takes a formatter for values that are not plain counts", () => {
        render(<Figure value={52.5} format={(v) => `${v}h`} />);
        expect(screen.getByText("52.5h")).toBeInTheDocument();
    });

    it("never announces a counting number on every frame", () => {
        render(<Figure value={412} roll />);
        expect(screen.getByText("412")).toHaveAttribute("aria-live", "off");
    });
});
