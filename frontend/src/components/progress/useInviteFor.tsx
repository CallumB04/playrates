import { useState } from "react";
import type { ProfileVisibility } from "@playrates/shared";
import InviteSheet from "./InviteSheet";

/** Your invite, and the sheet that sends it. For whoever's signed in,
 *  given rather than looked up, for the menus that are handed their user. */
export const useInviteFor = (
    user:
        | { username: string; profileVisibility?: ProfileVisibility }
        | null
        | undefined
) => {
    const [sharing, setSharing] = useState(false);
    const username = user?.username;
    const sheet =
        sharing && username ? (
            <InviteSheet
                username={username}
                publicProfile={user.profileVisibility === "everyone"}
                onClose={() => setSharing(false)}
            />
        ) : null;
    return { ready: !!username, open: () => setSharing(true), sheet };
};
