/** The product name and its one line, in one place so the two cannot drift. */
export const BRAND_NAME = "PlayRates";
export const BRAND_MOTTO = "A single home for all your games";

export interface PitchPart {
    text: string;
    /** Where the welcome notification links this part. The homepage links
     *  none of it. */
    to?: string;
}

/**
 * The paragraph under the motto, said the same way on the homepage and in the
 * welcome notification.
 *
 * In parts rather than one string because the notification links two words
 * of it, and a second copy of the sentence is exactly what this file exists
 * to prevent.
 */
export const BRAND_PITCH: readonly PitchPart[] = [
    { text: "Log, rate and review the " },
    { text: "games", to: "/library" },
    {
        text: " you’ve played, manage your backlog and wishlist, and interact with your friends and the ",
    },
    { text: "community", to: "/community" },
    { text: "." },
];

/** The pitch as one run of text, for where none of it is a link. */
export const BRAND_PITCH_TEXT = BRAND_PITCH.map((part) => part.text).join("");
