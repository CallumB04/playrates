const ERROR_PARAMS = ["error", "error_code", "error_description"];

export interface AuthRedirectError {
    /** The person backed out on the provider's page, rather than it failing. */
    cancelled: boolean;
    /** The same address with the error taken off, to put back in the bar. */
    cleanUrl: string;
}

/**
 * Reads the error a provider sign-in comes back with. Supabase puts it in the
 * query or the hash depending on the flow, and leaves it in the address bar,
 * where a reload or a shared link would carry it along.
 */
export const readAuthRedirectError = (
    href: string
): AuthRedirectError | null => {
    const url = new URL(href);
    const hash = new URLSearchParams(url.hash.slice(1));
    const source = url.searchParams.has("error")
        ? url.searchParams
        : hash.has("error")
          ? hash
          : null;
    if (!source) return null;

    const cancelled = source.get("error") === "access_denied";
    for (const key of ERROR_PARAMS) source.delete(key);
    if (source === hash) url.hash = hash.toString();

    return { cancelled, cleanUrl: url.toString() };
};
