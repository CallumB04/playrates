import { useRef, useState, type PointerEvent, type MouseEvent } from "react";

/** How far left a row has to go before letting go clears it. */
export const CLEAR_AT = 96;
/** Under this, a touch is a tap or a scroll, not a swipe. */
const SLOP = 10;

/**
 * Swipe a row left to clear it, on a touch screen. A mouse never swipes,
 * and an upward or downward drag is left to scroll the list. The tap that
 * ends a swipe is swallowed, so letting go over a link doesn't open it.
 */
export const useSwipeToClear = (onClear: () => void, enabled: boolean) => {
    const start = useRef<{ x: number; y: number } | null>(null);
    const swiping = useRef(false);
    const swiped = useRef(false);
    const [offset, setOffset] = useState(0);

    const reset = () => {
        start.current = null;
        swiping.current = false;
        setOffset(0);
    };

    return {
        offset,
        handlers: {
            onPointerDown: (event: PointerEvent<HTMLElement>) => {
                swiped.current = false;
                if (!enabled || event.pointerType !== "touch") return;
                start.current = { x: event.clientX, y: event.clientY };
            },
            onPointerMove: (event: PointerEvent<HTMLElement>) => {
                if (!start.current) return;
                const dx = event.clientX - start.current.x;
                const dy = event.clientY - start.current.y;
                if (!swiping.current) {
                    if (Math.abs(dy) > SLOP) {
                        start.current = null;
                        return;
                    }
                    if (dx > -SLOP) return;
                    swiping.current = true;
                    event.currentTarget.setPointerCapture?.(event.pointerId);
                }
                setOffset(Math.min(0, dx));
            },
            onPointerUp: () => {
                if (swiping.current) {
                    swiped.current = true;
                    if (offset <= -CLEAR_AT) onClear();
                }
                reset();
            },
            onPointerCancel: reset,
            onClickCapture: (event: MouseEvent<HTMLElement>) => {
                if (swiped.current) {
                    event.preventDefault();
                    event.stopPropagation();
                    swiped.current = false;
                }
            },
        },
    };
};
