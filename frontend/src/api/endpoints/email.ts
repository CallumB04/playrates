import type { UnsubscribeStatus } from "@playrates/shared";
import { api } from "../client";

/* None of these need a session: the token in an email's link is the proof,
   so they work from a phone's mail app with nobody signed in. */

// `all` widens any link's token to every email of the same member, so the
// page can offer it without anyone signed in.
export const unsubscribeEmail = async ({
    token,
    all = false,
}: {
    token: string;
    all?: boolean;
}): Promise<UnsubscribeStatus> =>
    (
        await api.post<UnsubscribeStatus>(
            "/email/unsubscribe",
            all ? { token, scope: "all" } : { token },
            { params: { t: token } }
        )
    ).data;

export const resubscribeEmail = async ({
    token,
    all = false,
}: {
    token: string;
    all?: boolean;
}): Promise<UnsubscribeStatus> =>
    (
        await api.post<UnsubscribeStatus>(
            "/email/resubscribe",
            all ? { token, scope: "all" } : { token }
        )
    ).data;
