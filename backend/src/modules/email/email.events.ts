import {
  REFERRAL,
  emailAllowed,
  resolveEmailPrefs,
  type NotificationKind,
} from "@playrates/shared";
import type { ProfileRow } from "../../types/database.types.js";
import {
  friendRequestEmail,
  giftEmail,
  inviteActiveEmail,
  inviteJoinedEmail,
  replyEmail,
  type EmailLinks,
  type ReleasedGame,
  type RenderedEmail,
} from "./email.templates.js";
import type { AudienceContact } from "./email.audience.js";
import type {
  MemberEmailRow,
  WishlistReleaseRow,
} from "../../types/database.types.js";

type Person = Pick<ProfileRow, "username" | "avatar_url">;

const str = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;
const num = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

/**
 * The email for a notification, from what was raised: its data, who it
 * is for and who did it. Null when something it needs is missing, as the
 * bell shows such a row as unknown rather than guessing.
 */
export const eventEmail = (
  kind: NotificationKind,
  data: Record<string, unknown>,
  recipient: Person,
  actor: Person | null,
  links: EmailLinks,
): RenderedEmail | null => {
  switch (kind) {
    case "friend_request":
      return actor
        ? friendRequestEmail(
            {
              actor: actor.username,
              actorAvatar: actor.avatar_url,
              recipient: recipient.username,
            },
            links,
          )
        : null;

    case "community_reply": {
      const threadId = num(data.threadId);
      const messageId = num(data.messageId);
      const threadTitle = str(data.threadTitle);
      if (!actor || threadId === null || messageId === null || !threadTitle) {
        return null;
      }
      return replyEmail(
        {
          actor: actor.username,
          threadId,
          threadTitle,
          messageId,
          excerpt: str(data.excerpt) ?? "",
        },
        links,
      );
    }

    case "gift_received": {
      const giver = str(data.username) ?? actor?.username;
      const item = str(data.item);
      if (!giver || !item) return null;
      return giftEmail(
        {
          giver,
          giverAvatar: actor?.avatar_url ?? null,
          item,
          recipient: recipient.username,
        },
        links,
      );
    }

    case "referral_joined": {
      const username = str(data.username) ?? actor?.username;
      if (!username) return null;
      return inviteJoinedEmail(
        { username, xp: REFERRAL.inviterXp, tokens: REFERRAL.inviterTokens },
        links,
      );
    }

    case "referral_active": {
      const username = str(data.username) ?? actor?.username;
      if (!username) return null;
      return inviteActiveEmail(
        {
          username,
          xp: num(data.xp) ?? REFERRAL.inviterXp,
          tokens: num(data.tokens) ?? REFERRAL.inviterTokens,
        },
        links,
      );
    }

    default:
      return null;
  }
};

/** Each member's games out on the day, in the order they came. */
export const groupWishlistReleases = (
  rows: WishlistReleaseRow[],
): Map<string, ReleasedGame[]> => {
  const byUser = new Map<string, ReleasedGame[]>();
  for (const row of rows) {
    const games = byUser.get(row.user_id) ?? [];
    // A game logged twice is still one game coming out.
    if (games.some((g) => g.id === row.game_id)) continue;
    games.push({ id: row.game_id, title: row.title, coverUrl: row.cover_url });
    byUser.set(row.user_id, games);
  }
  return byUser;
};

/** What the news audience needs doing to match members' settings. */
export interface ReconcilePlan {
  /** Contacts to add or update, and whether they're subscribed. */
  upsert: { email: string; subscribed: boolean }[];
  /** Contacts with no member behind them: deleted, moved address. */
  remove: string[];
  /** Members Resend has unsubscribed and we haven't heard: their news
   *  switch goes off here rather than them being subscribed again. */
  newsOff: string[];
}

export const planReconcile = (
  members: MemberEmailRow[],
  contacts: AudienceContact[],
): ReconcilePlan => {
  const have = new Map(contacts.map((c) => [c.email.toLowerCase(), c]));
  const wanted = new Set<string>();
  const plan: ReconcilePlan = { upsert: [], remove: [], newsOff: [] };

  for (const member of members) {
    const email = member.email.toLowerCase();
    wanted.add(email);
    const subscribed = emailAllowed(
      resolveEmailPrefs(member.email_prefs),
      "news",
    );
    const contact = have.get(email);
    if (!contact) {
      if (subscribed) plan.upsert.push({ email: member.email, subscribed });
    } else if (contact.unsubscribed && subscribed) {
      plan.newsOff.push(member.id);
    } else if (!contact.unsubscribed && !subscribed) {
      plan.upsert.push({ email: member.email, subscribed: false });
    }
  }
  for (const contact of contacts) {
    if (!wanted.has(contact.email.toLowerCase())) plan.remove.push(contact.email);
  }
  return plan;
};
