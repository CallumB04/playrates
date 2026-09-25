import { useCallback, useSyncExternalStore } from "react";

/** Tailwind's own, in the units Tailwind writes them in, so `sm:` in a class
 *  and SM here switch at the same pixel. theme.css leaves them at the
 *  defaults. */
export const BREAKPOINT = {
    sm: "(min-width: 40rem)",
    lg: "(min-width: 64rem)",
    xl: "(min-width: 80rem)",
} as const;

/** Whether a media query matches, kept current as it changes. False where
 *  there is no window to ask, and on the server. */
export const useMediaQuery = (query: string): boolean => {
    const subscribe = useCallback(
        (onChange: () => void) => {
            if (typeof window === "undefined" || !window.matchMedia) {
                return () => {};
            }
            const media = window.matchMedia(query);
            media.addEventListener("change", onChange);
            return () => media.removeEventListener("change", onChange);
        },
        [query]
    );

    return useSyncExternalStore(
        subscribe,
        () =>
            typeof window !== "undefined" && !!window.matchMedia
                ? window.matchMedia(query).matches
                : false,
        () => false
    );
};
