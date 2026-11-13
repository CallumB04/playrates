/**
 * How long a surface takes to leave, from the --exit-ms its stylesheet
 * gives it: nought under reduced motion, and in a test, where there is no
 * stylesheet, so it goes at once.
 */
export const exitMs = (el: Element | null): number => {
    if (!el) return 0;
    const ms = Number.parseFloat(
        getComputedStyle(el).getPropertyValue("--exit-ms")
    );
    return Number.isFinite(ms) && ms > 0 ? ms : 0;
};
