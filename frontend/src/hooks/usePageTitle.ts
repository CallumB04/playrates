import { useEffect } from "react";
import { BRAND_NAME } from "../constants/brand";

/** What the tab reads with no page name of its own. Kept in step with the
 *  <title> in index.html, so the first paint and the first render agree. */
const DEFAULT_TITLE = `${BRAND_NAME} / Video Game Tracker`;

/**
 * Names the tab "<page> / PlayRates" for as long as the caller is mounted.
 *
 * Called with nothing — or with a name that is still loading — the tab falls
 * back to the site default rather than showing a half-written title.
 */
export const usePageTitle = (page?: string | null) => {
    useEffect(() => {
        document.title = page ? `${page} / ${BRAND_NAME}` : DEFAULT_TITLE;

        /* A page that unmounts with nothing taking its place — the error
           boundary catching, say — would otherwise leave its name in the tab. */
        return () => {
            document.title = DEFAULT_TITLE;
        };
    }, [page]);
};
