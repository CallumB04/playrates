import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

const subscribe = (onChange: () => void): (() => void) => {
    if (typeof window === "undefined" || !window.matchMedia) return () => {};
    const media = window.matchMedia(QUERY);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
};

const getSnapshot = (): boolean =>
    typeof window !== "undefined" && !!window.matchMedia
        ? window.matchMedia(QUERY).matches
        : false;

/** theme.css covers the CSS animations. This is for the two driven from JS:
 *  the figure roll and the indeterminate sweep. */
export const usePrefersReducedMotion = (): boolean =>
    useSyncExternalStore(subscribe, getSnapshot, () => false);
