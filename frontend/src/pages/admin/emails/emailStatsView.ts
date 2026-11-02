import {
    EMAIL_LIMITS,
    type EmailMessageGroup,
    type EmailMessageStatus,
    type EmailStats,
} from "@playrates/shared";

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
    friend_accepted: "Friends accepted",
    community_upvote_milestone: "Message reactions",
    review_upvote_milestone: "Review reactions",
    list_upvote_milestone: "List loves",
    gaming_25_love_milestone: "Gaming 25 loves",
    community_reply: "Replies",
    gift_received: "Gifts",
    referral_joined: "Invites joined",
    referral_active: "Invites got going",
    welcome: "Welcome",
    wishlist_release: "Wishlist release days",
    streak_at_risk: "Streak reminders",
    task_nearly_done: "Task reminders",
    weekly_digest: "Weekly digest",
    news_test: "Your tests",
    digest_test: "Your digest tests",
    announcement: "Announcements",
    patch_notes: "Patch notes",
    admin_alert: "Alerts to admins",
};

export const kindLabel = (kind: string) => KINDS[kind] ?? kind;

const STATUSES: Record<
    EmailMessageStatus,
    { label: string; className: string }
> = {
    delivered: { label: "Delivered", className: "text-success" },
    sent: { label: "Sent", className: "text-content-muted" },
    delayed: { label: "Delayed", className: "text-warning" },
    capped: { label: "Held back by the cap", className: "text-warning" },
    failed: { label: "Didn’t send", className: "text-danger" },
    bounced: { label: "Bounced", className: "text-danger" },
    suppressed: { label: "Not sent, bounced before", className: "text-danger" },
    complained: { label: "Marked as spam", className: "text-danger" },
};

/** What became of one email, worded and coloured for the log. */
export const statusMark = (status: EmailMessageStatus) => STATUSES[status];

export const GROUP_LABELS: Record<EmailMessageGroup, string> = {
    delivered: "Delivered",
    waiting: "On its way",
    problems: "Problems",
};

export { EMAIL_LIMITS };
