import { useState } from "react";
import InviteSheet from "./InviteSheet";

/** Your invite, and the sheet that sends it. For whoever's signed in,
 *  given rather than looked up, for the menus that are handed their user. */
export const useInviteFor = (username: string | undefined) => {
    const [sharing, setSharing] = useState(false);
    const sheet =
        sharing && username ? (
            <InviteSheet
                username={username}
                onClose={() => setSharing(false)}
            />
        ) : null;
    return { ready: !!username, open: () => setSharing(true), sheet };
};
