/**
 * Why the viewer cannot upvote this, or null when they can. Said out
 * loud rather than just greying the button: a control that does nothing
 * reads as broken unless it says why.
 */
export const whyCannotVote = (
    viewerId: string | undefined,
    authorId: string | undefined,
    noun = "review"
): string | null => {
    if (!viewerId) return "Sign in to vote";
    // The API refuses it too; this only saves the round trip.
    if (viewerId === authorId) return `You can't upvote your own ${noun}`;
    return null;
};

/** The same for a love, which isn't a vote and doesn't say "upvote". */
export const whyCannotLove = (
    viewer: string | undefined,
    owner: string | undefined
): string | null => {
    if (!viewer) return "Sign in to love it";
    if (viewer === owner) return "You can't love your own";
    return null;
};
