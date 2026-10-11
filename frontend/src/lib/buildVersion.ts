declare const __BUILD_ID__: string;

/** The build this tab is running. */
export const BUILD_ID = __BUILD_ID__;

/** Whether the build the site is serving is a different one. Anything that
 *  is not a version file says no: a failed check must never reload a page. */
export const isStaleBuild = (current: string, served: unknown): boolean =>
    typeof served === "object" &&
    served !== null &&
    typeof (served as { id?: unknown }).id === "string" &&
    (served as { id: string }).id !== current;

/**
 * Asks the site which build it serves. A tab left open across a deploy keeps
 * running the old code against the new API, and breaks on the first response
 * it no longer understands: an author that became null for private accounts
 * took the home page down for exactly that reason.
 */
export const siteHasNewerBuild = async (): Promise<boolean> => {
    // The dev server has no version file and rebuilds on every save anyway.
    if (!import.meta.env.PROD) return false;
    try {
        const response = await fetch("/version.json", { cache: "no-store" });
        if (!response.ok) return false;
        return isStaleBuild(BUILD_ID, await response.json());
    } catch {
        return false;
    }
};
