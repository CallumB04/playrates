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
    profile: Pick<MyProfile, "avatarUrl" | "bio" | "checklistDismissedAt">;
    /** Undefined while still loading. */
    logCount: number | undefined;
    friendCount: number | undefined;
}

/**
 * The four things that make a profile worth visiting, worked out from what
 * the account already holds rather than tracked as steps of their own, so a
 * picture added anywhere ticks the box here.
 */
export const setupSteps = ({
    profile,
    logCount,
    friendCount,
}: SetupFacts): SetupStep[] => [
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
        done: (logCount ?? 0) > 0,
    },
    {
        // No directory of people: the community is where they are met.
        key: "friend",
        label: "Add a friend",
        to: "/community",
        done: (friendCount ?? 0) > 0,
    },
];

/**
 * Shown until it is finished or put away. Held back while the counts load,
 * so a finished account does not flash a list it has already done.
 */
export const showSetupChecklist = (
    facts: SetupFacts,
    steps: SetupStep[]
): boolean =>
    !facts.profile.checklistDismissedAt &&
    facts.logCount !== undefined &&
    facts.friendCount !== undefined &&
    steps.some((step) => !step.done);
