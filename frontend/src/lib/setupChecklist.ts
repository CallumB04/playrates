import type { MyProfile } from "@playrates/shared";
import { shelfPath } from "./profilePaths";

export type SetupStepKey =
    "picture" | "bio" | "log" | "review" | "friend" | "post";

export interface SetupStep {
    key: SetupStepKey;
    label: string;
    /** Where the step is done. */
    to: string;
    done: boolean;
}

interface SetupFacts {
    profile: Pick<MyProfile, "username" | "avatarUrl" | "bio">;
    /** Each undefined while still loading. */
    logCount: number | undefined;
    reviewCount: number | undefined;
    friendCount: number | undefined;
    /** Threads they have a message in: one started counts, as does a reply. */
    postCount: number | undefined;
}

/**
 * The things that make a profile worth visiting, worked out from what
 * the account already holds rather than tracked as steps of their own, so a
 * picture added anywhere ticks the box here.
 *
 * Null while the counts load, so nothing is judged on a guess.
 */
export const setupSteps = ({
    profile,
    logCount,
    reviewCount,
    friendCount,
    postCount,
}: SetupFacts): SetupStep[] | null => {
    if (
        logCount === undefined ||
        reviewCount === undefined ||
        friendCount === undefined ||
        postCount === undefined
    ) {
        return null;
    }
    return [
        {
            key: "picture",
            label: "Add a profile picture",
            to: "/settings?section=profile",
            done: !!profile.avatarUrl,
        },
        {
            key: "bio",
            label: "Write a bio",
            to: "/settings?section=profile",
            done: profile.bio.trim().length > 0,
        },
        {
            key: "log",
            label: "Log your first game",
            to: "/library",
            done: logCount > 0,
        },
        {
            // A review hangs off a log, and the played shelf is where they are.
            key: "review",
            label: "Write your first review",
            to: shelfPath(profile.username, "played"),
            done: reviewCount > 0,
        },
        {
            // No directory of people: the community is where they are met.
            key: "friend",
            label: "Add a friend",
            to: "/community",
            done: friendCount > 0,
        },
        {
            key: "post",
            label: "Post in the community",
            to: "/community",
            done: postCount > 0,
        },
    ];
};

/** What is left to show, or null once there is nothing: not dismissable,
 *  so finishing it is the only way it goes. */
export const unfinished = (steps: SetupStep[] | null): SetupStep[] | null =>
    steps && steps.some((step) => !step.done) ? steps : null;
