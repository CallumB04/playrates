import { useEffect, useRef, type RefObject } from "react";

interface DismissOptions {
    /** Listen only while the thing is open. */
    enabled: boolean;
    /** Escape closes it too. Off for a control that already handles Escape
     *  itself, where a second listener would close whatever sits behind. */
    escape?: boolean;
}

/**
 * Closes a popover when the pointer goes down anywhere outside it. Takes
 * several refs because a portalled menu is not inside its trigger in the DOM.
 *
 * mousedown rather than click, so the menu is gone before a click lands on
 * whatever was underneath it.
 */
export const useDismiss = (
    refs: RefObject<HTMLElement | null>[],
    onDismiss: () => void,
    { enabled, escape = false }: DismissOptions
) => {
    // The latest callback, without re-subscribing every render it changes.
    const dismiss = useRef(onDismiss);
    dismiss.current = onDismiss;
    const targets = useRef(refs);
    targets.current = refs;

    useEffect(() => {
        if (!enabled) return;

        const onPointerDown = (event: MouseEvent) => {
            const target = event.target as Node;
            if (!targets.current.some((ref) => ref.current?.contains(target))) {
                dismiss.current();
            }
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") dismiss.current();
        };

        document.addEventListener("mousedown", onPointerDown);
        if (escape) document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("mousedown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [enabled, escape]);
};
