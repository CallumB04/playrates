import { ResendError, type ResendClient } from "./email.resend.js";

export interface AudienceContact {
  email: string;
  unsubscribed: boolean;
}

export interface BroadcastContent {
  /** Only ever seen in Resend's dashboard. */
  name: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * The list news emails go to. Resend sends a broadcast to everyone in it
 * who hasn't unsubscribed, outside the daily cap on transactional email,
 * so it is kept in step with members' settings.
 */
export interface NewsAudience {
  /** Adds them, or updates them if they are there. */
  upsertContact(email: string, subscribed: boolean): Promise<void>;
  /** No-op for an address not there. */
  removeContact(email: string): Promise<void>;
  listContacts(): Promise<AudienceContact[]>;
  /** Sends it now. The broadcast's id. */
  broadcast(content: BroadcastContent): Promise<string>;
}

const PAGE = 100;

/**
 * Resend's contacts, in one segment (what Resend called an audience until
 * it renamed them). A contact is addressed by its email throughout, so
 * nothing of Resend's has to be stored here.
 */
export const createResendAudience = (
  client: ResendClient,
  segmentId: string,
  from: string,
): NewsAudience => {
  const contact = (email: string) => `/contacts/${encodeURIComponent(email)}`;

  return {
    async upsertContact(email, subscribed) {
      try {
        await client.request("PATCH", contact(email), {
          unsubscribed: !subscribed,
        });
        return;
      } catch (error) {
        if (!(error instanceof ResendError && error.status === 404)) throw error;
      }
      await client.request("POST", "/contacts", {
        email,
        unsubscribed: !subscribed,
        segments: [{ id: segmentId }],
      });
    },

    async removeContact(email) {
      try {
        await client.request("DELETE", contact(email));
      } catch (error) {
        if (!(error instanceof ResendError && error.status === 404)) throw error;
      }
    },

    async listContacts() {
      const found: AudienceContact[] = [];
      let after: string | undefined;
      for (;;) {
        const query = new URLSearchParams({ limit: String(PAGE) });
        if (after) query.set("after", after);
        const page = await client.request<{
          has_more?: boolean;
          data: { id: string; email: string; unsubscribed: boolean }[];
        }>("GET", `/segments/${segmentId}/contacts?${query}`);
        for (const c of page.data) {
          found.push({ email: c.email, unsubscribed: c.unsubscribed });
        }
        const last = page.data.at(-1);
        if (!page.has_more || !last) return found;
        after = last.id;
      }
    },

    async broadcast({ name, subject, html, text }) {
      const { id } = await client.request<{ id: string }>(
        "POST",
        "/broadcasts",
        { segment_id: segmentId, from, subject, html, text, name, send: true },
      );
      return id;
    },
  };
};
