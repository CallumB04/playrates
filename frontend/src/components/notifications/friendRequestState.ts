import type { FriendRelation } from "@playrates/shared";

/** Either the request is still yours to answer, or it says what became of it. */
export type FriendRequestState =
    | { actionable: true }
    | { actionable: false; note: string };

/**
 * A friend request notification stays in the list once it has been answered —
 * it is a record of something that happened, not a task that disappears when
 * you do it. What changes is whether it still offers the buttons.
 *
 * The relation comes back live on every fetch, so a request accepted on the
 * profile page reads as accepted here without the row being rewritten.
 */
export const friendRequestState = (
    relation: FriendRelation | null
): FriendRequestState => {
    switch (relation) {
        case "request-received":
            return { actionable: true };
        case "friend":
            return { actionable: false, note: "You are friends now." };
        // Only reachable if they withdrew and you re-sent in the other
        // direction between two fetches. Rare, but it has an honest answer.
        case "request-sent":
            return { actionable: false, note: "Waiting on them." };
        case null:
            return { actionable: false, note: "That request is no longer open." };
    }
};
