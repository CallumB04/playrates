import type { EmailAudience } from "@playrates/shared";
import { formatCount } from "../../../lib/format";

/* What the admin is told around a broadcast, the same wherever one is sent
   from: the announcement form, the patch notes list and the entry itself. */

/** Who an email reaches: only members with news emails on, not everyone. */
export const emailedTo = (audience: EmailAudience | undefined) => {
    if (!audience) return "everyone with news emails on";
    const n = audience.newsSubscribers;
    return `${formatCount(n)} ${n === 1 ? "member" : "members"}`;
};

export const testNotice = (email: boolean) =>
    email
        ? "In your bell and your email, and nobody else’s"
        : "In your bell, and nobody else’s";

export const sentNotice = (recipients: number, email: boolean) =>
    `In ${formatCount(recipients)} inboxes${email ? ", and on its way by email" : ""}`;
