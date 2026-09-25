/** The product name and its one line, in one place so the two cannot drift. */
export const BRAND_NAME = "PlayRates";
export const BRAND_MOTTO = "A single home for all your games";

/**
 * The paragraph under the motto, said the same way on the homepage and in the
 * welcome notification.
 *
 * In three parts rather than one string because the notification links the
 * last phrase to /community while the homepage leaves it as text — and a
 * second copy of the sentence is exactly what this file exists to prevent.
 */
export const BRAND_PITCH = {
    lead: "Log, rate and review the games you’ve played, manage your backlog and wishlist, and interact with your friends and",
    community: "the community",
    tail: ".",
} as const;
