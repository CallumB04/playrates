import { useEffect, useState, type RefObject } from "react";

/**
 * Whether an element under a line clamp is hiding any of itself. Measured
 * rather than guessed: a character count is not a line count, and it is wrong
 * at every width but one.
 *
 * Read it while the clamp is on. With the clamp off nothing is hidden, so a
 * toggle that undoes the clamp should stay shown while it is open.
 */
export const useClamped = (
    ref: RefObject<HTMLElement | null>,
    content: unknown
): boolean => {
    const [clamped, setClamped] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const measure = () => setClamped(el.scrollHeight > el.clientHeight + 1);

        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(el);
        return () => observer.disconnect();
    }, [ref, content]);

    return clamped;
};
