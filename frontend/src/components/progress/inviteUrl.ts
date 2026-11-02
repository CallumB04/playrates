import { profilePath } from "../../lib/profilePaths";

/** The link that counts a friend as yours: to your profile when anyone may
 *  see it, so the link's preview and where it lands are you and your games;
 *  to the home page when it isn't, where a private profile would say
 *  nothing to someone who's never been. */
export const inviteUrl = (username: string, publicProfile: boolean) =>
    publicProfile
        ? `${window.location.origin}${profilePath(username)}?ref=${encodeURIComponent(username)}`
        : `${window.location.origin}/?ref=${encodeURIComponent(username)}`;
