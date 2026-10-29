import { EMAIL_LIMITS, type EmailStats } from "@playrates/shared";

/** Amber with a fifth of the allowance left, red with almost none. */
export const limitTone = (used: number, total: number) =>
    used >= total * 0.95 ? "danger" : used >= total * 0.8 ? "warning" : "ok";

/**
 * Supabase's account emails, as what Resend sent less what PlayRates logged.
 * The two clocks differ by seconds, so it never goes below none.
 */
export const accountEmails = (stats: EmailStats) =>
    stats.resend ? Math.max(0, stats.resend.sent - stats.last24h.sent) : null;

/** Everything sent against the daily allowance: Resend's count where there
 *  is one, PlayRates' own otherwise. */
export const dailyUsed = (stats: EmailStats) =>
    stats.resend?.sent ?? stats.last24h.sent;

export const monthSent = (stats: EmailStats) =>
    stats.days.reduce((sum, d) => sum + d.sent, 0);

const KINDS: Record<string, string> = {
    friend_request: "Friend requests",
    community_reply: "Replies",
    gift_received: "Gifts",
    referral_joined: "Invites joined",
    referral_active: "Invites got going",
    welcome: "Welcome",
    wishlist_release: "Wishlist release days",
    news_test: "Your tests",
};

export const kindLabel = (kind: string) => KINDS[kind] ?? kind;

export { EMAIL_LIMITS };
