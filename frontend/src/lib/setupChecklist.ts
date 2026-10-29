import { SETUP_STEPS, type SetupStepKey } from "@playrates/shared";
import { profilePath, shelfPath } from "./profilePaths";

export type { SetupStepKey };

export interface SetupStep {
    key: SetupStepKey;
    label: string;
    /** Where the step is done. */
    to: string;
    done: boolean;
}

const STEPS: Record<
    SetupStepKey,
    { label: string; to: (username: string) => string }
> = {
    // Both in the profile's own editor, opened by the link.
    picture: {
        label: "Add a profile picture",
        to: (u) => `${profilePath(u)}?edit=profile`,
    },
    bio: { label: "Write a bio", to: (u) => `${profilePath(u)}?edit=profile` },
    log: { label: "Log your first game", to: () => "/library" },
    // A rating and a review both hang off a log, on the played shelf.
    rate: { label: "Rate a game", to: (u) => shelfPath(u, "played") },
    review: {
        label: "Write your first review",
        to: (u) => shelfPath(u, "played"),
    },
    favourites: {
        label: "Add favourite games",
        to: (u) => profilePath(u),
    },
    // No directory of people: the community is where they are met.
    friend: { label: "Add a friend", to: () => "/community" },
    post: { label: "Post in the community", to: () => "/community" },
};

/**
 * The things that make a profile worth visiting, as the server judged them
 * from what the account holds, so a picture added anywhere ticks the box
 * here, and the reward for all of them is paid against the same list.
 *
 * Null while that loads, so nothing is judged on a guess.
 */
export const setupSteps = (
    username: string,
    done: Record<SetupStepKey, boolean> | undefined
): SetupStep[] | null =>
    done
        ? SETUP_STEPS.map((key) => ({
              key,
              label: STEPS[key].label,
              to: STEPS[key].to(username),
              done: done[key],
          }))
        : null;

/** What is left to show, or null once there is nothing: not dismissable,
 *  so finishing it is the only way it goes. */
export const unfinished = (steps: SetupStep[] | null): SetupStep[] | null =>
    steps && steps.some((step) => !step.done) ? steps : null;
