import { usePageMeta } from "./usePageMeta";

/**
 * Names the tab "<page> / PlayRates" for as long as the caller is mounted,
 * with the site's own description and a canonical for the current path.
 *
 * Called with nothing — or with a name that is still loading — the tab falls
 * back to the site default rather than showing a half-written title.
 */
export const usePageTitle = (page?: string | null) =>
    usePageMeta({ title: page });
