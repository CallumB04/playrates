import { useCallback, useEffect, useRef, useState } from "react";

/** How far a mouse moves before a press is a drag, not a click. */
const MOUSE_SLOP = 4;
/** How long a finger rests on a cover before it picks it up. Moving
 *  further than TOUCH_SLOP first is a scroll, and leaves it be. */
export const TOUCH_HOLD_MS = 220;
const TOUCH_SLOP = 8;

export interface SlotDrag {
    from: number;
    x: number;
    y: number;
    /** The place under the pointer, if it's one of ours. */
    over: number | null;
}

const placeAt = (x: number, y: number): number | null => {
    const el = document
        .elementFromPoint?.(x, y)
        ?.closest<HTMLElement>("[data-slot]");
    return el ? Number(el.dataset.slot) : null;
};

/**
 * Dragging one place onto another, by mouse or finger alike: a mouse
 * picks up as soon as it moves, a finger once it has rested a moment, so
 * a swipe across the covers still scrolls. Pointer events where the
 * browser lets them run, touch events where it would take the touch for
 * a scroll.
 */
export const useSlotDrag = (onSwap: (from: number, to: number) => void) => {
    const [drag, setDrag] = useState<SlotDrag | null>(null);
    const pending = useRef<{
        from: number;
        x: number;
        y: number;
        touch: boolean;
        timer?: ReturnType<typeof setTimeout>;
    } | null>(null);
    // The click a drag ends in mustn't also choose the place.
    const dragged = useRef(false);
    // A finger's drag under way: its moves are ours, not the page's.
    const holding = useRef(false);
    const latest = useRef(onSwap);
    useEffect(() => {
        latest.current = onSwap;
    });

    const move = useCallback((x: number, y: number) => {
        const start = pending.current;
        if (start && !start.touch) {
            if (Math.hypot(x - start.x, y - start.y) < MOUSE_SLOP) return;
            pending.current = null;
            dragged.current = true;
            setDrag({ from: start.from, x, y, over: placeAt(x, y) });
            return;
        }
        if (start?.touch) {
            // Moved before it was held: a scroll.
            if (Math.hypot(x - start.x, y - start.y) > TOUCH_SLOP) {
                clearTimeout(start.timer);
                pending.current = null;
            }
            return;
        }
        setDrag((d) => (d ? { ...d, x, y, over: placeAt(x, y) } : d));
    }, []);

    const end = useCallback(() => {
        holding.current = false;
        clearTimeout(pending.current?.timer);
        pending.current = null;
        setDrag((d) => {
            if (d && d.over !== null && d.over !== d.from)
                latest.current(d.from, d.over);
            return null;
        });
    }, []);

    /* A mouse by pointer events; a finger by touch events, which go on
       after the browser would have cancelled the pointer for a scroll. */
    useEffect(() => {
        const mouse = (e: PointerEvent) => e.pointerType === "mouse";
        const onPointerMove = (e: PointerEvent) =>
            mouse(e) && move(e.clientX, e.clientY);
        const onPointerUp = (e: PointerEvent) => mouse(e) && end();
        const onTouchMove = (e: TouchEvent) => {
            const t = e.touches[0];
            if (!t) return;
            if (holding.current) e.preventDefault();
            move(t.clientX, t.clientY);
        };
        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
        window.addEventListener("touchmove", onTouchMove, { passive: false });
        window.addEventListener("touchend", end);
        window.addEventListener("touchcancel", end);
        return () => {
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerup", onPointerUp);
            window.removeEventListener("touchmove", onTouchMove);
            window.removeEventListener("touchend", end);
            window.removeEventListener("touchcancel", end);
        };
    }, [move, end]);

    const start = (from: number, e: React.PointerEvent) => {
        if (e.button !== 0) return;
        dragged.current = false;
        const touch = e.pointerType !== "mouse";
        const at = { from, x: e.clientX, y: e.clientY, touch };
        pending.current = at;
        if (touch) {
            pending.current.timer = setTimeout(() => {
                if (pending.current !== at) return;
                pending.current = null;
                dragged.current = true;
                holding.current = true;
                if ("vibrate" in navigator) navigator.vibrate(8);
                setDrag({ from, x: at.x, y: at.y, over: from });
            }, TOUCH_HOLD_MS);
        }
    };

    return {
        drag,
        start,
        /** True once for the click that ends a drag. */
        consumeDrag: () => {
            const was = dragged.current;
            dragged.current = false;
            return was;
        },
    };
};
