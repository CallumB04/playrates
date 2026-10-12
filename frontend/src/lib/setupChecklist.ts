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

const JUST_DONE: Record<SetupStepKey, string> = {
    picture: "Profile picture added",
    bio: "Bio written",
    log: "First game logged",
    friend: "First friend added",
};

/**
 * The toast for a step just finished, or null when nothing new is done.
 * Says which step when it was one, and where that leaves them; the last one
 * says it is all done instead.
 */
export const setupMessage = (
    before: SetupStep[],
    after: SetupStep[]
): string | null => {
    const wasDone = new Set(before.filter((s) => s.done).map((s) => s.key));
    const justDone = after.filter((s) => s.done && !wasDone.has(s.key));
    if (justDone.length === 0) return null;

    const done = after.filter((s) => s.done).length;
    if (done === after.length) {
        return "You're all set! Every Get started step is done.";
    }
    const what =
        justDone.length === 1
            ? JUST_DONE[justDone[0]!.key]
            : `${justDone.length} steps done`;
    return `${what}. Get started: ${done} of ${after.length} done.`;
};
