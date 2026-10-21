import type { MyProfile } from "@playrates/shared";

/**
 * Whether to greet this account now: signed in, never dismissed the welcome,
 * past choosing a username, and not in the middle of the signup or login
 * sheet — two sheets stacked on a phone leave the one underneath unreachable.
 */
export const owesWelcome = (
    user: Pick<MyProfile, "onboardedAt" | "usernameChosenAt"> | null,
    accountFormOpen: boolean
): boolean =>
    !!user &&
    user.onboardedAt === null &&
    user.usernameChosenAt !== null &&
    !accountFormOpen;
