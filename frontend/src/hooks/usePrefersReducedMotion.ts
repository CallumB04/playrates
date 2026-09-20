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

/**
 * The CSS half of the motion spec is handled by a media block in theme.css.
 * This is for the two animations driven from JS — the figure roll and the
 * indeterminate sweep — which CSS cannot opt out of on their behalf.
 */
export const usePrefersReducedMotion = (): boolean =>
    useSyncExternalStore(subscribe, getSnapshot, () => false);
