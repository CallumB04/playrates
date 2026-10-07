import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { createRef } from "react";
import StickyLogBar from "./StickyLogBar";

type Callback = (entries: Partial<IntersectionObserverEntry>[]) => void;
let report: Callback = () => {};

vi.stubGlobal(
    "IntersectionObserver",
    class {
        constructor(callback: Callback) {
            report = callback;
        }
        observe() {}
        disconnect() {}
    }
);

afterEach(() => {
    report = () => {};
});

const setup = () => {
    const anchor = createRef<HTMLSpanElement>();
    const onPress = vi.fn();
    render(
        <>
            <span ref={anchor} />
            <StickyLogBar
                anchor={anchor}
                label="Log this game"
                onPress={onPress}
            />
        </>
    );
    return { onPress };
};

const bar = () => screen.getByText("Log this game").closest("div")!;

describe("StickyLogBar", () => {
    it("stays hidden while the page's own buttons are on screen", () => {
        setup();
        act(() =>
            report([
                {
                    isIntersecting: true,
                    boundingClientRect: { top: 300 } as DOMRect,
                },
            ])
        );
        expect(bar()).toHaveAttribute("aria-hidden", "true");
        expect(screen.getByRole("button", { hidden: true })).toHaveAttribute(
            "tabindex",
            "-1"
        );
    });

    it("slides in once they've scrolled away above", () => {
        const { onPress } = setup();
        act(() =>
            report([
                {
                    isIntersecting: false,
                    boundingClientRect: { top: -40 } as DOMRect,
                },
            ])
        );
        expect(bar()).toHaveAttribute("aria-hidden", "false");
        screen.getByRole("button", { name: "Log this game" }).click();
        expect(onPress).toHaveBeenCalledOnce();
    });

    /* Below the fold on a short screen isn't "scrolled past". */
    it("stays hidden when the buttons are below the screen instead", () => {
        setup();
        act(() =>
            report([
                {
                    isIntersecting: false,
                    boundingClientRect: { top: 900 } as DOMRect,
                },
            ])
        );
        expect(bar()).toHaveAttribute("aria-hidden", "true");
    });
});
