import type { FriendRelation } from "@playrates/shared";

/** null means "no relationship yet" — the old code used an empty string. */
export type Relation = FriendRelation | null;

/**
 * Pure presentation helpers for the friend button. Extracted from ProfilePage
 * so they can be tested directly: three branches × hover × breakpoint is a lot
 * of behaviour to have buried in a 1,100-line component.
 */
export const getUserRelationIcon = (relation: Relation): string => {
    switch (relation) {
        case "friend":
            return "user-group";
        case "request-sent":
            return "user-clock";
        case "request-received":
            return "user-check";
        default:
            return "user-plus";
    }
};

export const getUserRelationText = (
    relation: Relation,
    isHovering: boolean,
    isCompact: boolean
): string => {
    switch (relation) {
        case "friend":
            return isHovering || isCompact ? "Remove Friend" : "Friends";
        case "request-sent":
            return isHovering || isCompact ? "Cancel Request" : "Request Sent";
        case "request-received":
            return isCompact ? "Accept" : "Accept Request";
        default:
            return "Add Friend";
    }
};

export const getUserRelationColors = (relation: Relation): string => {
    switch (relation) {
        case "friend":
            return "text-success-soft hover:text-danger-soft border-success hover:border-danger";
        case "request-sent":
            return "text-warning-muted hover:text-danger-soft border-warning-soft hover:border-danger";
        case "request-received":
            return "text-success-muted hover:text-success border-success-soft hover:border-success-strong";
        default:
            return "text-content hover:text-success border-content hover:border-success-strong";
    }
};

/** How many games fit on one page of the profile grid. */
export const getProfileGamesPerPage = (width: number): number => {
    if (width >= 1280) return 27;
    if (width >= 1024) return 21;
    if (width >= 768) return 28;
    return 24;
};
