import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/* Where each history entry was left, by its key. Per tab, like history. */
const positions = new Map<string, number>();

/**
 * Back and Forward return a page to where it was left; a new page starts at
 * the top; a change to the query string alone (a filter) leaves the page
 * where it is. React Router's ScrollRestoration does this only on a data
 * router, which would add ~17 KB to every first load.
 */
export const useScrollMemory = () => {
    const location = useLocation();
    const navigation = useNavigationType();
    const lastPath = useRef(location.pathname);

    // Remembered as the page scrolls, under the entry being looked at.
    useEffect(() => {
        const key = location.key;
        const remember = () => positions.set(key, window.scrollY);
        window.addEventListener("scroll", remember, { passive: true });
        return () => window.removeEventListener("scroll", remember);
    }, [location.key]);

    useLayoutEffect(() => {
        const samePage = lastPath.current === location.pathname;
        lastPath.current = location.pathname;
        if (navigation === "POP") {
            const saved = positions.get(location.key);
            if (saved !== undefined) {
                // Instant: a smooth glide from the top reads as a jump.
                window.scrollTo({ top: saved, behavior: "instant" });
            }
            return;
        }
        if (!samePage) window.scrollTo({ top: 0, behavior: "instant" });
    }, [location.key, location.pathname, navigation]);
};
