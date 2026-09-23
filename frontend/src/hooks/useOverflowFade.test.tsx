import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useOverflowFade } from "./useOverflowFade";

/** jsdom has no ResizeObserver, and no layout to drive one. */
const observe = vi.fn();
const disconnect = vi.fn();
let notify: (() => void) | undefined;

beforeEach(() => {
    observe.mockClear();
    disconnect.mockClear();
    vi.stubGlobal(
        "ResizeObserver",
        class {
            constructor(callback: () => void) {
                notify = callback;
            }
            observe = observe;
            disconnect = disconnect;
            unobserve = vi.fn();
        }
    );
});

afterEach(() => {
    notify = undefined;
    vi.unstubAllGlobals();
});

let mask: string | undefined;

/* The ref has to be attached the way React attaches it — during commit,
   before the effect runs — or the observer is never wired up. */
const Strip = () => {
    const fade = useOverflowFade<HTMLDivElement>();
    mask = fade.style?.maskImage;
    return <div data-testid="strip" ref={fade.ref} onScroll={fade.onScroll} />;
};

/** jsdom reports every box as zero, so the scroll geometry is declared. */
const geometry = (
    el: HTMLElement,
    scrollLeft: number,
    scrollWidth: number,
    clientWidth = 100
) => {
    for (const [key, value] of Object.entries({
        scrollLeft,
        scrollWidth,
        clientWidth,
    })) {
        Object.defineProperty(el, key, { value, configurable: true });
    }
};

const renderStrip = (scrollLeft: number, scrollWidth: number) => {
    const utils = render(<Strip />);
    const el = utils.getByTestId("strip");
    geometry(el, scrollLeft, scrollWidth);
    fireEvent.scroll(el);
    return { ...utils, el };
};

describe("useOverflowFade", () => {
    it("leaves a strip whose content fits alone", () => {
        renderStrip(0, 100);
        expect(mask).toBeUndefined();
    });

    it("fades only the end when the strip is at its start", () => {
        renderStrip(0, 300);
        expect(mask).toContain("black 0");
        expect(mask).toContain("transparent 100%");
    });

    it("fades both ends mid-scroll", () => {
        renderStrip(100, 300);
        expect(mask).toContain("transparent 0");
        expect(mask).toContain("transparent 100%");
    });

    it("fades only the start when the strip is at its end", () => {
        renderStrip(200, 300);
        expect(mask).toContain("transparent 0");
        expect(mask).toContain("black 100%");
    });

    /* Fractional widths never land exactly on the end, so a pixel either
       side of the extremes still counts as being at them. */
    it("treats a pixel off the start as still at the start", () => {
        renderStrip(1, 300);
        expect(mask).toContain("black 0");
    });

    it("treats a pixel off the end as still at the end", () => {
        renderStrip(199, 300);
        expect(mask).toContain("black 100%");
    });

    it("measures again when the strip is resized", () => {
        const { el } = renderStrip(0, 100);
        expect(mask).toBeUndefined();

        geometry(el, 0, 300);
        act(() => notify?.());

        expect(mask).toContain("transparent 100%");
    });

    it("observes the strip and disconnects on unmount", () => {
        const { unmount } = renderStrip(0, 300);

        expect(observe).toHaveBeenCalledTimes(1);
        expect(disconnect).not.toHaveBeenCalled();

        unmount();
        expect(disconnect).toHaveBeenCalledTimes(1);
    });
});
