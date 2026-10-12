import type { MyProfile } from "@playrates/shared";

export type SetupStepKey = "picture" | "bio" | "log" | "friend";

export interface SetupStep {
    key: SetupStepKey;
    label: string;
    /** Where the step is done. */
    to: string;
    done: boolean;
}

interface SetupFacts {
    profile: Pick<MyProfile, "avatarUrl" | "bio">;
    /** Undefined while still loading. */
    logCount: number | undefined;
    friendCount: number | undefined;
}

/**
 * The four things that make a profile worth visiting, worked out from what
 * the account already holds rather than tracked as steps of their own, so a
 * picture added anywhere ticks the box here.
 *
 * Null while the counts load, so nothing is judged on a guess.
 */
export const setupSteps = ({
    profile,
    logCount,
    friendCount,
}: SetupFacts): SetupStep[] | null => {
    if (logCount === undefined || friendCount === undefined) return null;
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
            // No directory of people: the community is where they are met.
            key: "friend",
            label: "Add a friend",
            to: "/community",
            done: friendCount > 0,
        },
    ];
};

/** What is left to show, or null once there is nothing: not dismissable,
 *  so finishing it is the only way it goes. */
export const unfinished = (steps: SetupStep[] | null): SetupStep[] | null =>
    steps && steps.some((step) => !step.done) ? steps : null;
