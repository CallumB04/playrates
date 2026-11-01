import { resolveEmailPrefs } from "@playrates/shared";
import type { PushSender } from "../../config/push.js";
import type { Defer } from "../../lib/afterResponse.js";
import type { Logger } from "../../lib/logger.js";
import type { NotificationDraft } from "../notifications/notifications.repository.js";
import type { ProfilesRepository } from "../profiles/profiles.repository.js";
import { isReminder, PUSHED, pushMessage } from "./push.messages.js";
import type { PushRepository } from "./push.repository.js";

export const createPushService = ({
  repo,
  sender,
  profiles,
  logger,
  defer,
}: {
  repo: PushRepository;
  /** Null without VAPID keys: nothing is pushed or offered. */
  sender: PushSender | null;
  profiles: Pick<ProfilesRepository, "findById">;
  logger: Logger;
  defer: Defer;
}) => {
  const service = {
    publicKey(): string | null {
      return sender?.publicKey ?? null;
    },

    async subscribe(
      userId: string,
      input: { endpoint: string; p256dh: string; auth: string },
      userAgent: string | null,
    ): Promise<void> {
      await repo.save(userId, { ...input, userAgent });
    },

    async unsubscribe(userId: string, endpoint: string): Promise<void> {
      await repo.remove(userId, endpoint);
    },

    /** To every device the member said yes on. How many took it. */
    async sendFor(draft: NotificationDraft): Promise<number> {
      if (!sender || !PUSHED.has(draft.kind)) return 0;
      const targets = await repo.forUser(draft.userId);
      if (targets.length === 0) return 0;

      const recipient = await profiles.findById(draft.userId);
      if (!recipient) return 0;
      // Reminders are asked for, under the same switch as their emails.
      if (
        isReminder(draft.kind) &&
        !resolveEmailPrefs(recipient.email_prefs).reminders
      ) {
        return 0;
      }
      const actor = draft.actorId
        ? await profiles.findById(draft.actorId)
        : null;
      const payload = pushMessage(
        draft.kind,
        draft.data ?? {},
        actor?.username ?? null,
        recipient.username,
      );
      if (!payload) return 0;

      let sent = 0;
      for (const target of targets) {
        const result = await sender.send(target, payload).catch((error) => {
          logger.warn({ err: error }, "push: send failed");
          return null;
        });
        if (result === "sent") sent += 1;
        if (result === "gone") await repo.forget(target.endpoint);
      }
      return sent;
    },

    /* After the response: a push never slows or fails what caused it. */

    afterRaise(draft: NotificationDraft): void {
      if (!sender || !PUSHED.has(draft.kind)) return;
      defer(
        service.sendFor(draft).catch((error) => {
          logger.error({ err: error, kind: draft.kind }, "push: failed");
        }),
      );
    },
  };
  return service;
};

export type PushService = ReturnType<typeof createPushService>;
