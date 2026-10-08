import {
    canSeeProfile,
    type FriendRelation,
    type ProfileVisibility,
} from "@playrates/shared";

export type ProfileAccess = "visible" | "hidden" | "unknown";

/**
 * Whether this viewer sees past someone's profile card. The API decides for
 * real; this keeps the page from asking for what it will be refused, and from
 * flashing "private" at a friend before their friends list has loaded.
 */
export const profileAccess = (
    visibility: ProfileVisibility,
    viewer: {
        isOwner: boolean;
        signedIn: boolean;
        /** null for no relation; undefined while the friends list loads. */
        relation: FriendRelation | null | undefined;
    }
): ProfileAccess => {
    const { isOwner, signedIn, relation } = viewer;
    if (canSeeProfile(visibility, { isOwner, isFriend: false }))
        return "visible";
    if (visibility !== "friends" || !signedIn) return "hidden";
    if (relation === undefined) return "unknown";
    return canSeeProfile(visibility, {
        isOwner,
        isFriend: relation === "friend",
    })
        ? "visible"
        : "hidden";
};
