/** Where the person came from, so signing up takes them back there: a path
 *  on this site only, as anything else (another site, "//evil.example")
 *  would make the page a way to send people off it. Home otherwise. */
export const returnTo = (state: unknown): string => {
    const from = (state as { from?: unknown } | null)?.from;
    return typeof from === "string" &&
        from.startsWith("/") &&
        !from.startsWith("//") &&
        !from.startsWith("/join") &&
        !from.startsWith("/login")
        ? from
        : "/";
};
