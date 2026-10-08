import {
    canSeeGames,
    type FriendRelation,
    type GamesVisibility,
} from "@playrates/shared";

export type GamesAccess = "visible" | "hidden" | "unknown";

/**
 * Whether this viewer gets someone's shelves. The API decides for real; this
 * keeps the page from asking for what it will be refused, and from flashing
 * "private" at a friend before their friends list has loaded.
 */
export const gamesAccess = (
    visibility: GamesVisibility,
    viewer: {
        isOwner: boolean;
        signedIn: boolean;
        /** null for no relation; undefined while the friends list loads. */
        relation: FriendRelation | null | undefined;
    }
): GamesAccess => {
    const { isOwner, signedIn, relation } = viewer;
    if (canSeeGames(visibility, { isOwner, isFriend: false })) return "visible";
    if (visibility !== "friends" || !signedIn) return "hidden";
    if (relation === undefined) return "unknown";
    return canSeeGames(visibility, { isOwner, isFriend: relation === "friend" })
        ? "visible"
        : "hidden";
};
