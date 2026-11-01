import webpush from "web-push";
import type { Env } from "./env.js";

/** A browser's push address and the keys to write to it. */
export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** What the service worker shows. */
export interface PushPayload {
  title: string;
  body: string;
  /** A path on the site, opened when the notification is tapped. */
  url: string;
  /** One of a kind replaces the last on the device rather than stacking. */
  tag: string;
}

export interface PushSender {
  readonly publicKey: string;
  /** "gone" when the push service has forgotten the browser: it was
   *  uninstalled, or notifications were turned off there. */
  send(target: PushTarget, payload: PushPayload): Promise<"sent" | "gone">;
}

/** A day: a reminder older than that is about a week already over. */
const TTL_SECONDS = 24 * 60 * 60;

export const pushFromEnv = (
  config: Pick<Env, "VAPID_PUBLIC_KEY" | "VAPID_PRIVATE_KEY" | "VAPID_SUBJECT">,
): PushSender | null => {
  const publicKey = config.VAPID_PUBLIC_KEY;
  const privateKey = config.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return null;
  const vapidDetails = { subject: config.VAPID_SUBJECT, publicKey, privateKey };

  return {
    publicKey,
    async send(target, payload) {
      try {
        await webpush.sendNotification(
          {
            endpoint: target.endpoint,
            keys: { p256dh: target.p256dh, auth: target.auth },
          },
          JSON.stringify(payload),
          { vapidDetails, TTL: TTL_SECONDS },
        );
        return "sent";
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) return "gone";
        throw error;
      }
    },
  };
};
