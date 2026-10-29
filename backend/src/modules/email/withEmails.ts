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
): NotificationsRepository => ({
  ...notifications,
  async raise(draft) {
    await notifications.raise(draft);
    if (EMAIL_CATEGORY_OF[draft.kind]) afterRaise(draft);
  },
});
