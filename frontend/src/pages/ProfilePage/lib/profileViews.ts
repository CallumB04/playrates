import { isProfileView, type ProfileView } from "@playrates/shared";

/** The profile itself, or one of the views under it. */
export type ProfileTab = "profile" | ProfileView;

/** The tab a URL segment names, or null for one this page doesn't have. */
export const parseProfileTab = (
    segment: string | undefined
): ProfileTab | null =>
    segment === undefined ? "profile" : isProfileView(segment) ? segment : null;

/* The shelf used to sit on the bare profile URL, so its parameters did too.
   Links and bookmarks from then still carry them. */
const SHELF_PARAMS = ["type", "sort", "direction", "ending", "page"];

/** Whether a query string on the bare profile belongs to the games view. */
export const isLegacyShelfSearch = (search: string): boolean => {
    const params = new URLSearchParams(search);
    return SHELF_PARAMS.some((key) => params.has(key));
};
