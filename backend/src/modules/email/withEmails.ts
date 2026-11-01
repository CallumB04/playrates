import { EMAIL_CATEGORY_OF } from "@playrates/shared";
import type {
  NotificationDraft,
  NotificationsRepository,
} from "../notifications/notifications.repository.js";

/**
 * The notifications repository, with an email after each raise that has
 * one. Wrapped where the repositories are wired, so the services that
 * raise notifications don't know email exists.
 */
export const withEmails = (
  notifications: NotificationsRepository,
  afterRaise: (draft: NotificationDraft) => void,
  afterRaiseOnce: (drafts: NotificationDraft[]) => void = () => {},
): NotificationsRepository => ({
  ...notifications,
  async raise(draft) {
    await notifications.raise(draft);
    if (EMAIL_CATEGORY_OF[draft.kind]) afterRaise(draft);
  },
  async raiseMilestone(userId, kind, dedupeKey, milestone, data) {
    await notifications.raiseMilestone(
      userId,
      kind,
      dedupeKey,
      milestone,
      data,
    );
    // One email for each milestone reached, ever: the key says which.
    afterRaise({
      userId,
      kind,
      data: { ...data, milestone },
      dedupeKey: `${dedupeKey}:${milestone}`,
    });
  },
  async raiseOnce(drafts) {
    const raised = await notifications.raiseOnce(drafts);
    // Each email is claimed once ever too, so passing on the drafts that
    // were already in the bell sends nothing twice.
    const emailed = drafts.filter((d) => EMAIL_CATEGORY_OF[d.kind]);
    if (emailed.length > 0) afterRaiseOnce(emailed);
    return raised;
  },
});
