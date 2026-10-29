import { z } from "zod";
import type { NotificationKind } from "./notification.js";

/**
 * The emails PlayRates sends that a member can turn off, one switch each.
 * Account emails (confirming an address, a password reset, security notices)
 * aren't here: those always send. Every category starts on.
 */
export const EMAIL_CATEGORIES = [
  {
    key: "friend_requests",
    label: "Friend requests",
    description: "When someone sends you a friend request.",
  },
  {
    key: "replies",
    label: "Replies to you",
    description:
      "When someone replies to one of your messages in the community.",
  },
  {
    key: "gifts_invites",
    label: "Gifts and invites",
    description:
      "When a friend sends you a gift, or someone you invited joins or gets going.",
  },
  {
    key: "wishlist_releases",
    label: "Wishlist release days",
    description: "On the day a game on your wishlist comes out.",
  },
  {
    key: "news",
    label: "News and patch notes",
    description:
      "Announcements and what's new in PlayRates. A few a month at most.",
  },
] as const;

export type EmailCategory = (typeof EMAIL_CATEGORIES)[number]["key"];
export const EMAIL_CATEGORY_KEYS = EMAIL_CATEGORIES.map((c) => c.key) as [
  EmailCategory,
  ...EmailCategory[],
];

/** One category, or every email that can be turned off. */
export type EmailScope = EmailCategory | "all";
export const EMAIL_SCOPES = ["all", ...EMAIL_CATEGORY_KEYS] as [
  EmailScope,
  ...EmailScope[],
];

/** Every switch, resolved: `all` off silences the rest whatever they say. */
export type EmailPrefs = Record<EmailScope, boolean>;

/** What's stored is sparse: a key not there is on. */
export const resolveEmailPrefs = (
  stored: Partial<Record<string, unknown>> | null | undefined,
): EmailPrefs =>
  Object.fromEntries(
    EMAIL_SCOPES.map((scope) => [scope, stored?.[scope] !== false]),
  ) as EmailPrefs;

/** Whether an email of this category may go to someone with these prefs. */
export const emailAllowed = (prefs: EmailPrefs, category: EmailCategory) =>
  prefs.all && prefs[category];

/** The in-app notifications that also send an email, and under which switch. */
export const EMAIL_CATEGORY_OF: Partial<
  Record<NotificationKind, EmailCategory>
> = {
  friend_request: "friend_requests",
  community_reply: "replies",
  gift_received: "gifts_invites",
  referral_joined: "gifts_invites",
  referral_active: "gifts_invites",
};

export const EmailPrefsPatchSchema = z
  .object(
    Object.fromEntries(
      EMAIL_SCOPES.map((scope) => [scope, z.boolean().optional()]),
    ) as Record<EmailScope, z.ZodOptional<z.ZodBoolean>>,
  )
  .strict();

export type EmailPrefsPatch = z.infer<typeof EmailPrefsPatchSchema>;

export const emailScopeLabel = (scope: EmailScope): string =>
  scope === "all"
    ? "PlayRates"
    : (EMAIL_CATEGORIES.find((c) => c.key === scope)?.label ?? scope);

/* ----------------------------------------------------------- unsubscribe */

/** The signed token every email's unsubscribe link carries. */
export const UnsubscribeTokenSchema = z.object({
  token: z.string().min(10).max(400),
});

export const ResubscribeSchema = z
  .object({ token: z.string().min(10).max(400) })
  .strict();

/** What an unsubscribe link is for, and whether it's on now. */
export interface UnsubscribeStatus {
  scope: EmailScope;
  label: string;
  on: boolean;
}

/** How many members a news email would reach now, for the admin's confirm. */
export interface EmailAudience {
  newsSubscribers: number;
}
