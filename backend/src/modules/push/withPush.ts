import type {
  NotificationDraft,
  NotificationsRepository,
} from "../notifications/notifications.repository.js";

/** The notifications repository, with a push after each raise, as
 *  withEmails adds an email. */
export const withPush = (
  notifications: NotificationsRepository,
  afterRaise: (draft: NotificationDraft) => void,
): NotificationsRepository => ({
  ...notifications,
  async raise(draft) {
    await notifications.raise(draft);
    afterRaise(draft);
  },
  async raiseOnce(drafts) {
    const raised = await notifications.raiseOnce(drafts);
    // Only what's new in the bell: the nudge job passes the same drafts
    // every day, and a push has no claim of its own to keep it to once.
    raised.forEach(afterRaise);
    return raised;
  },
});
