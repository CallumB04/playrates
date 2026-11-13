import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";

/**
 * One pill that slides to whichever segment is chosen, rather than each
 * segment lighting up on its own: the eye follows where the choice went.
 *
 * Placed straight on the element, before paint, so it never shows in the
 * old place first. It slides only from its second place on: arriving on the
 * page, it is simply there. Hidden while the chosen segment has no size
 * (the control not yet shown), and placed again whenever the track resizes.
 */
export const useSlidingIndicator = (
    track: RefObject<HTMLElement | null>,
    indicator: RefObject<HTMLElement | null>,
    active: () => HTMLElement | null | undefined
) => {
    const current = useRef(active);
    current.current = active;

    const place = useRef(() => {
        const bar = indicator.current;
        if (!bar) return;
        const target = current.current();
        if (!target?.offsetWidth) {
            bar.style.opacity = "0";
            return;
        }
        bar.style.opacity = "";
        bar.style.width = `${target.offsetWidth}px`;
        bar.style.height = `${target.offsetHeight}px`;
        bar.style.transform = `translate(${target.offsetLeft}px, ${target.offsetTop}px)`;
    });

    // Every render: cheap, and a move only animates when the place changes.
    useLayoutEffect(() => {
        place.current();
        const bar = indicator.current;
        if (bar && !("ready" in bar.dataset)) {
            const frame = requestAnimationFrame(() => {
                bar.dataset.ready = "";
            });
            return () => cancelAnimationFrame(frame);
        }
    });

    useEffect(() => {
        const el = track.current;
        if (!el || typeof ResizeObserver === "undefined") return;
        const observer = new ResizeObserver(() => place.current());
        observer.observe(el);
        return () => observer.disconnect();
    }, [track]);
};
