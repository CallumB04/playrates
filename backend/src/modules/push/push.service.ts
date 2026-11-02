import { resolveEmailPrefs } from "@playrates/shared";
import type { PushPayload, PushSender } from "../../config/push.js";
import type { Defer } from "../../lib/afterResponse.js";
import type { Logger } from "../../lib/logger.js";
import type { NotificationDraft } from "../notifications/notifications.repository.js";
import type { ProfilesRepository } from "../profiles/profiles.repository.js";
import {
  isReminder,
  joinedMessage,
  PUSHED,
  pushMessage,
} from "./push.messages.js";
import type { PushRepository } from "./push.repository.js";

export const createPushService = ({
  repo,
  sender,
  profiles,
  adminIds,
  logger,
  defer,
}: {
  repo: PushRepository;
  /** Null without VAPID keys: nothing is pushed or offered. */
  sender: PushSender | null;
  profiles: Pick<ProfilesRepository, "findById">;
  adminIds: () => Promise<string[]>;
  logger: Logger;
  defer: Defer;
}) => {
  /** To each of these devices. How many took it. */
  const deliver = async (
    targets: Awaited<ReturnType<PushRepository["forUser"]>>,
    payload: PushPayload,
  ): Promise<number> => {
    if (!sender) return 0;
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
  };

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

    /** A notification, as a push to the member's devices. */
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
      return payload ? deliver(targets, payload) : 0;
    },

    /** A new member, to every admin's devices. */
    async sendJoined(username: string): Promise<number> {
      if (!sender) return 0;
      let sent = 0;
      for (const admin of await adminIds()) {
        sent += await deliver(
          await repo.forUser(admin),
          joinedMessage(username),
        );
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

    afterJoined(username: string): void {
      if (!sender) return;
      defer(
        service.sendJoined(username).catch((error) => {
          logger.error({ err: error }, "push: joined failed");
        }),
      );
    },
  };
  return service;
};

export type PushService = ReturnType<typeof createPushService>;
