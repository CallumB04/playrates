import { UserCheck, UserPlus, Users, UserRoundCheck } from "lucide-react";
import type { FriendRelation } from "@playrates/shared";
import type { IconComponent } from "../../../lib/icons";

/** null means there is no relationship between the two users yet. */
export type Relation = FriendRelation | null;

/* Kept out of the page so the label matrix — four relations, each varying by
   hover and breakpoint — is testable. */
export const getUserRelationIcon = (relation: Relation): IconComponent => {
    switch (relation) {
        case "friend":
            return Users;
        case "request-sent":
            return UserRoundCheck;
        case "request-received":
            return UserCheck;
        default:
            return UserPlus;
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
