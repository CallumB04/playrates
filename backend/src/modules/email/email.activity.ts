import type { ResendClient } from "./email.resend.js";

/** One email in Resend's list of what was sent. */
export interface ListedEmail {
  id: string;
  created_at: string;
  last_event: string | null;
}

export interface RecentSends {
  sent: number;
  /** It sent more than were counted. */
  more: boolean;
  bounced: number;
  complained: number;
}

/** What Resend has sent lately, across the whole account. */
export interface SendActivity {
  since(at: Date): Promise<RecentSends>;
}

const PAGE = 100;
/** The daily allowance is 100, so three pages is past anything that
 *  matters, and an admin page load stays at three requests. */
const MAX_PAGES = 3;

/** Resend's "2026-10-29 15:08:47.879+00", which not every parser takes. */
export const parseResendTime = (value: string): number =>
  Date.parse(value.replace(" ", "T").replace(/([+-]\d\d)$/, "$1:00"));

/**
 * Adds a page, newest first, to the count, as far back as `since`. True
 * once it has passed `since`, when older pages have nothing to add.
 */
export const tallyPage = (
  emails: ListedEmail[],
  since: number,
  into: RecentSends,
): boolean => {
  for (const email of emails) {
    if (parseResendTime(email.created_at) < since) return true;
    into.sent += 1;
    if (email.last_event === "bounced") into.bounced += 1;
    if (email.last_event === "complained") into.complained += 1;
  }
  return false;
};

/**
 * Counts from Resend's own list rather than PlayRates' log, as the list
 * also has the account emails Supabase sends through the same account.
 */
export const createResendActivity = (client: ResendClient): SendActivity => ({
  async since(at) {
    const counted: RecentSends = { sent: 0, more: false, bounced: 0, complained: 0 };
    let after: string | null = null;
    for (let page = 0; page < MAX_PAGES; page++) {
      const query: string = after ? `&after=${encodeURIComponent(after)}` : "";
      const { data, has_more } = await client.request<{
        data: ListedEmail[];
        has_more: boolean;
      }>("GET", `/emails?limit=${PAGE}${query}`);
      if (tallyPage(data, at.getTime(), counted) || !has_more) return counted;
      after = data.at(-1)?.id ?? null;
      if (!after) return counted;
    }
    counted.more = true;
    return counted;
  },
});
