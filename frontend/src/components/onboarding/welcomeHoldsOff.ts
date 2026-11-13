/** Pages the welcome doesn't open over: the join pages, which say their
 *  own welcome first, and the pages a sign-up links to (the terms,
 *  privacy, setting a password). */
const LEFT_ALONE = [
    "/join",
    "/login",
    "/reset-password",
    "/terms",
    "/privacy",
    "/contact",
    "/unsubscribe",
];

export const welcomeHoldsOff = (pathname: string): boolean =>
    LEFT_ALONE.some(
        (path) => pathname === path || pathname.startsWith(`${path}/`)
    );
