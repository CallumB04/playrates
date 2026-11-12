import { useEffect, useRef, useState, type PointerEvent } from "react";

/** How long a finger rests before it counts as a hold, not a tap. */
export const HOLD_MS = 450;

/** How far a finger can drift and still be holding, not scrolling. */
const DRIFT_PX = 10;

/**
 * A hold for touch and pen, where there's no hover and no right click to
 * offer a second action. A mouse is left alone: it has its own controls.
 * The click a hold ends in still fires, so `consumeHold` tells the caller
 * to ignore that one.
 */
export const useLongPress = (onHold: () => void) => {
    const latest = useRef(onHold);
    useEffect(() => {
        latest.current = onHold;
    });
    const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
    const from = useRef<{ x: number; y: number } | null>(null);
    const held = useRef(false);
    const [pressing, setPressing] = useState(false);

    const cancel = () => {
        clearTimeout(timer.current);
        from.current = null;
        setPressing(false);
    };
    useEffect(() => () => clearTimeout(timer.current), []);

    return {
        pressing,
        consumeHold: () => {
            const was = held.current;
            held.current = false;
            return was;
        },
        handlers: {
            onPointerDown: (event: PointerEvent) => {
                if (event.pointerType === "mouse") return;
                held.current = false;
                from.current = { x: event.clientX, y: event.clientY };
                setPressing(true);
                timer.current = setTimeout(() => {
                    held.current = true;
                    from.current = null;
                    setPressing(false);
                    if ("vibrate" in navigator) navigator.vibrate(12);
                    latest.current();
                }, HOLD_MS);
            },
            onPointerMove: (event: PointerEvent) => {
                const start = from.current;
                if (
                    start &&
                    Math.hypot(
                        event.clientX - start.x,
                        event.clientY - start.y
                    ) > DRIFT_PX
                )
                    cancel();
            },
            onPointerUp: cancel,
            onPointerCancel: cancel,
            onPointerLeave: cancel,
            // A held picture would offer to save itself instead.
            onContextMenu: (event: { preventDefault: () => void }) =>
                event.preventDefault(),
        },
    };
};
