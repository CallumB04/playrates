import { useMediaQuery } from "./useMediaQuery";

/** theme.css covers the CSS animations. This is for the two driven from JS:
 *  the figure roll and the indeterminate sweep. */
export const usePrefersReducedMotion = (): boolean =>
    useMediaQuery("(prefers-reduced-motion: reduce)");
