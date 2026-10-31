/* A minute under the API's ten, so a check that passes here isn't refused
   there by the time the request lands. */
const RECENT_MS = 9 * 60_000;

/** When the session last proved who it is, from its token's `amr` claim,
 *  in ms. Refreshing the token doesn't move it. */
export const signedInAt = (accessToken: string): number | null => {
    const payload = accessToken.split(".")[1];
    if (!payload) return null;
    try {
        const json = JSON.parse(
            atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
        ) as { amr?: { timestamp?: unknown }[] };
        const times = (json.amr ?? [])
            .map((entry) => Number(entry?.timestamp))
            .filter(Number.isFinite);
        return times.length > 0 ? Math.max(...times) * 1000 : null;
    } catch {
        return null;
    }
};

/** Whether the API will take this session for what wants a fresh sign-in. */
export const signedInRecently = (
    accessToken: string | undefined,
    now = Date.now()
): boolean => {
    const at = accessToken ? signedInAt(accessToken) : null;
    return at !== null && now - at < RECENT_MS;
};
