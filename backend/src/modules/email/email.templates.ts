import {
  EMAIL_COLOURS,
  SHOP_ITEMS,
  emailButton,
  emailLayout,
  emailLink,
  emailParagraph,
  emailPlainLink,
  emailStrong,
  emailText,
  escapeHtml,
  parseAnnouncementBody,
  type AnnouncementTone,
  type EmailScope,
  type RichTextDoc,
} from "@playrates/shared";
import { richTextToEmailHtml, richTextToEmailText } from "./email.richText.js";

/**
 * Every email the API sends, one pure function each. Anything a member or
 * an admin wrote is escaped here; links are absolute, built on `site`.
 */

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/** Where an email's links go: the site, and its two ways out. */
export interface EmailLinks {
  site: string;
  /** The page that turns this email's switch off, or for a broadcast the
   *  provider's own unsubscribe placeholder. */
  unsubscribe: string;
  settings: string;
}

const C = EMAIL_COLOURS;
const SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/** Why each kind of email came, in its footer. */
export const EMAIL_REASONS: Record<EmailScope, string> = {
  all: "You're getting this because you just joined PlayRates.",
  friend_requests:
    "You're getting this because you have friend request emails on.",
  replies: "You're getting this because you have reply emails on.",
  gifts_invites:
    "You're getting this because you have gift and invite emails on.",
  wishlist_releases:
    "You're getting this because you have wishlist release emails on.",
  news: "You're getting this because you have news emails on.",
};

const footerLinks = (scope: EmailScope, links: EmailLinks) => [
  {
    href: links.unsubscribe,
    label: scope === "all" ? "Turn off all emails" : "Turn these off",
  },
  { href: links.settings, label: "Email settings" },
];

/** A title or a name, cut for a subject line. */
const clip = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;

const build = ({
  scope,
  links,
  subject,
  preview,
  title,
  body,
  lines,
}: {
  scope: EmailScope;
  links: EmailLinks;
  subject: string;
  preview: string;
  /** Plain text: escaped here. */
  title: string;
  /** Trusted HTML, built from the pieces in the shared layout. */
  body: string;
  /** The plain-text version of `body`. */
  lines: string[];
}): RenderedEmail => {
  const footer = footerLinks(scope, links);
  return {
    subject,
    html: emailLayout({
      preview: escapeHtml(preview),
      title: escapeHtml(title),
      body,
      reason: EMAIL_REASONS[scope],
      site: links.site,
      links: footer,
    }),
    text: emailText({ title, lines, reason: EMAIL_REASONS[scope], links: footer }),
  };
};

const url = (links: EmailLinks, path: string) => `${links.site}${path}`;

const avatar = (src: string | null, alt: string) =>
  src && /^https?:\/\//.test(src)
    ? `<img src="${escapeHtml(src)}" width="48" height="48" alt="${escapeHtml(alt)}" style="display:block;margin:0 0 16px;border:0;border-radius:24px;">`
    : "";

const quote = (text: string) =>
  emailParagraph(
    escapeHtml(text),
    `padding:4px 0 4px 14px;border-left:3px solid ${C.rule};font-style:italic;`,
  );

/* ------------------------------------------------------- friend request */

export const friendRequestEmail = (
  data: { actor: string; actorAvatar: string | null; recipient: string },
  links: EmailLinks,
): RenderedEmail => {
  const href = url(links, `/user/${encodeURIComponent(data.recipient)}/friends`);
  const name = escapeHtml(data.actor);
  return build({
    scope: "friend_requests",
    links,
    subject: `${data.actor} sent you a friend request`,
    preview: `${data.actor} wants to be friends on PlayRates.`,
    title: `${data.actor} sent you a friend request`,
    body: [
      avatar(data.actorAvatar, data.actor),
      emailParagraph(
        `${emailStrong(name)} wants to be friends on PlayRates. You can accept or decline it from your requests.`,
      ),
      emailButton(href, "Open your requests"),
      emailPlainLink(href),
    ].join("\n"),
    lines: [
      `${data.actor} wants to be friends on PlayRates. You can accept or decline it from your requests.`,
      "",
      `Open your requests: ${href}`,
    ],
  });
};

/* ---------------------------------------------------------------- reply */

export const replyEmail = (
  data: {
    actor: string;
    threadId: number;
    threadTitle: string;
    messageId: number;
    /** Spoilers already hidden, as the in-app notification has it. */
    excerpt: string;
  },
  links: EmailLinks,
): RenderedEmail => {
  const href = url(links, `/community/thread/${data.threadId}#message-${data.messageId}`);
  return build({
    scope: "replies",
    links,
    subject: `${data.actor} replied to you in ${clip(data.threadTitle, 60)}`,
    preview: data.excerpt || `${data.actor} replied to you.`,
    title: `${data.actor} replied to you`,
    body: [
      emailParagraph(`In ${emailStrong(escapeHtml(data.threadTitle))}:`),
      data.excerpt ? quote(data.excerpt) : "",
      emailButton(href, "View reply"),
      emailPlainLink(href),
    ].join("\n"),
    lines: [
      `In ${data.threadTitle}:`,
      ...(data.excerpt ? ["", `"${data.excerpt}"`] : []),
      "",
      `View reply: ${href}`,
    ],
  });
};

/* ----------------------------------------------------------------- gift */

const NOUNS: Record<string, string> = {
  frame: "frame",
  theme: "card theme",
  font: "name font",
  colour: "name colour",
  reaction: "reaction",
};
const SINGLES: Record<string, string> = {
  slot_showcase: "an extra showcase slot",
  slot_pinned_list: "an extra pinned list slot",
  slot_pinned_review: "an extra pinned review slot",
  streak_shield: "a spare streak shield",
};

/** As the shop says it: "the Neon frame". Mirrors the frontend's itemName. */
export const giftItemName = (item: string): string => {
  const def = SHOP_ITEMS.find((i) => i.item === item);
  if (!def) return "something from the shop";
  return SINGLES[item] ?? `the ${def.label} ${NOUNS[def.group] ?? ""}`.trim();
};

/** Where a gift is put to use. Mirrors the frontend's giftPath. */
export const giftPath = (item: string, username: string): string => {
  const profile = `/user/${encodeURIComponent(username)}`;
  if (item === "slot_pinned_review") return `${profile}?edit=pinned_reviews`;
  if (item === "slot_showcase") return `${profile}/badges?edit=showcase`;
  if (item === "slot_pinned_list") return "/progress#pinned-lists";
  const group = SHOP_ITEMS.find((i) => i.item === item)?.group;
  if (!group) return "/shop";
  if (group === "shield") return "/progress#streak";
  if (group === "font" || group === "colour") return "/progress#name";
  return `/progress#${group}`;
};

export const giftEmail = (
  data: { giver: string; giverAvatar: string | null; item: string; recipient: string },
  links: EmailLinks,
): RenderedEmail => {
  const href = url(links, giftPath(data.item, data.recipient));
  const item = giftItemName(data.item);
  return build({
    scope: "gifts_invites",
    links,
    subject: `${data.giver} sent you a gift`,
    preview: `${data.giver} gifted you ${item}.`,
    title: `${data.giver} sent you a gift`,
    body: [
      avatar(data.giverAvatar, data.giver),
      emailParagraph(
        `${emailStrong(escapeHtml(data.giver))} gifted you ${escapeHtml(item)}. It's yours now.`,
      ),
      emailButton(href, "Use your gift"),
      emailPlainLink(href),
    ].join("\n"),
    lines: [
      `${data.giver} gifted you ${item}. It's yours now.`,
      "",
      `Use your gift: ${href}`,
    ],
  });
};

/* -------------------------------------------------------------- invites */

export const inviteJoinedEmail = (
  data: { username: string; xp: number; activeAfter: number },
  links: EmailLinks,
): RenderedEmail => {
  const href = url(links, `/user/${encodeURIComponent(data.username)}`);
  const name = escapeHtml(data.username);
  const after = `Once they've played ${data.activeAfter} games, you'll both get a bit more.`;
  return build({
    scope: "gifts_invites",
    links,
    subject: `${data.username} joined PlayRates from your invite`,
    preview: `You've earned ${data.xp} XP for the invite.`,
    title: `${data.username} joined from your invite`,
    body: [
      emailParagraph(
        `${emailStrong(name)} signed up and said you sent them. You've earned ${emailStrong(`${data.xp} XP`)} for it.`,
      ),
      emailParagraph(escapeHtml(after)),
      emailButton(href, "See their profile"),
      emailPlainLink(href),
    ].join("\n"),
    lines: [
      `${data.username} signed up and said you sent them. You've earned ${data.xp} XP for it.`,
      "",
      after,
      "",
      `See their profile: ${href}`,
    ],
  });
};

export const inviteActiveEmail = (
  data: { username: string; xp: number; tokens: number },
  links: EmailLinks,
): RenderedEmail => {
  const href = url(links, "/progress");
  const reward = `${data.xp} XP and ${data.tokens} tokens`;
  return build({
    scope: "gifts_invites",
    links,
    subject: `${data.username} got going on PlayRates`,
    preview: `You've earned ${reward} for inviting them.`,
    title: `${data.username} got going`,
    body: [
      emailParagraph(
        `${emailStrong(escapeHtml(data.username))}, who joined from your invite, has played enough games to count. You've earned ${emailStrong(reward)}.`,
      ),
      emailButton(href, "See your progress"),
      emailPlainLink(href),
    ].join("\n"),
    lines: [
      `${data.username}, who joined from your invite, has played enough games to count. You've earned ${reward}.`,
      "",
      `See your progress: ${href}`,
    ],
  });
};

/* ------------------------------------------------------ wishlist release */

export interface ReleasedGame {
  id: number;
  title: string;
  coverUrl: string | null;
}

const gameRow = (game: ReleasedGame, href: string) => {
  const cover =
    game.coverUrl && /^https?:\/\//.test(game.coverUrl)
      ? `<td width="60" valign="top" style="padding:0 14px 0 0;"><a href="${href}" target="_blank"><img src="${escapeHtml(game.coverUrl)}" width="60" height="80" alt="" style="display:block;border:0;border-radius:6px;object-fit:cover;"></a></td>`
      : "";
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px;"><tr>${cover}<td valign="middle" style="font-family:${SANS};font-size:16px;line-height:24px;">${emailLink(href, emailStrong(escapeHtml(game.title)))}</td></tr></table>`;
};

export const wishlistReleaseEmail = (
  data: { games: ReleasedGame[]; username: string },
  links: EmailLinks,
): RenderedEmail => {
  const single = data.games.length === 1 ? data.games[0] : undefined;
  const gameHref = (g: ReleasedGame) => url(links, `/game/${g.id}`);
  const href = single
    ? gameHref(single)
    : url(links, `/user/${encodeURIComponent(data.username)}/games?type=wishlist`);
  const label = single ? "See the game" : "See your wishlist";
  const title = single
    ? `${single.title} is out today`
    : `${data.games.length} games on your wishlist are out today`;
  const intro = single
    ? "A game on your wishlist comes out today."
    : "Some games on your wishlist come out today.";
  return build({
    scope: "wishlist_releases",
    links,
    subject: title,
    preview: intro,
    title,
    body: [
      emailParagraph(intro),
      ...data.games.map((g) => gameRow(g, gameHref(g))),
      emailButton(href, label),
      emailPlainLink(href),
    ].join("\n"),
    lines: [
      intro,
      "",
      ...data.games.map((g) => `${g.title}: ${gameHref(g)}`),
      "",
      `${label}: ${href}`,
    ],
  });
};

/* -------------------------------------------------------------- welcome */

export const welcomeEmail = (
  data: { username: string; firstName: string | null },
  links: EmailLinks,
): RenderedEmail => {
  const steps = [
    {
      title: "Log the games you've played",
      text: "Add what you've played, what you're playing and what you want to play next.",
      path: "/library",
    },
    {
      title: "Add your friends",
      text: "Find people you know and see what they're playing.",
      path: "/community",
    },
    {
      title: "Make your Gaming 25",
      text: "Pick the 25 games that mean the most to you.",
      path: `/user/${encodeURIComponent(data.username)}/gaming-25`,
    },
  ];
  const name = data.firstName?.trim() || data.username;
  const href = url(links, "/library");
  return build({
    scope: "all",
    links,
    subject: "Welcome to PlayRates",
    preview: "Three good places to start.",
    title: `Welcome to PlayRates, ${name}`,
    body: [
      emailParagraph("You're all set up. Here are three good places to start:"),
      ...steps.map((s, i) =>
        emailParagraph(
          `${emailStrong(`${i + 1}. ${emailLink(url(links, s.path), escapeHtml(s.title))}`)}<br>${escapeHtml(s.text)}`,
        ),
      ),
      emailButton(href, "Log your first games"),
      emailPlainLink(href),
    ].join("\n"),
    lines: [
      "You're all set up. Here are three good places to start:",
      "",
      ...steps.flatMap((s, i) => [
        `${i + 1}. ${s.title}: ${url(links, s.path)}`,
        `   ${s.text}`,
      ]),
    ],
  });
};

/* --------------------------------------------------------- announcement */

const TONE_LABELS: Record<AnnouncementTone, string> = {
  update: "Update",
  info: "Info",
  warning: "Heads up",
  celebration: "Celebration",
};

const eyebrow = (label: string) =>
  `<p class="small" style="margin:-4px 0 12px;font-family:${SANS};font-size:12px;line-height:16px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:${C.iris};">${label}</p>`;

const absolute = (links: EmailLinks, href: string) =>
  href.startsWith("/") ? `${links.site}${href}` : href;

export const announcementEmail = (
  data: { tone: AnnouncementTone; title: string; body: string; link: string | null },
  links: EmailLinks,
): RenderedEmail => {
  const parts = parseAnnouncementBody(data.body);
  // Escaped before line breaks become <br>, so a break can't open a tag.
  const html = parts
    .map((p) => {
      const text = escapeHtml(p.text).replace(/\n/g, "<br>");
      return p.href ? emailLink(escapeHtml(absolute(links, p.href)), text) : text;
    })
    .join("");
  const text = parts
    .map((p) => (p.href ? `${p.text} (${absolute(links, p.href)})` : p.text))
    .join("");
  const href = data.link ? absolute(links, data.link) : null;
  return build({
    scope: "news",
    links,
    subject: data.title,
    preview: parts.map((p) => p.text).join("").slice(0, 120),
    title: data.title,
    body: [
      eyebrow(TONE_LABELS[data.tone]),
      emailParagraph(html),
      href ? emailButton(escapeHtml(href), "Take a look") : "",
      href ? emailPlainLink(escapeHtml(href)) : "",
    ].join("\n"),
    lines: [text, ...(href ? ["", `Take a look: ${href}`] : [])],
  });
};

/* ---------------------------------------------------------- patch notes */

export const patchNotesEmail = (
  data: {
    /** What the bell says: "New patch notes: v1.1". */
    subject: string;
    title: string | null;
    doc: RichTextDoc;
    link: string;
  },
  links: EmailLinks,
): RenderedEmail => {
  const href = absolute(links, data.link);
  const title = data.title ?? "New patch notes";
  const options = { skipFirstHeading: data.title !== null };
  return build({
    scope: "news",
    links,
    subject: data.subject,
    preview: "What's new and what's fixed in PlayRates.",
    title,
    body: [
      eyebrow("Patch notes"),
      richTextToEmailHtml(data.doc, options),
      emailButton(escapeHtml(href), "Read on PlayRates"),
      emailPlainLink(escapeHtml(href)),
    ].join("\n"),
    lines: [
      ...richTextToEmailText(data.doc, options),
      "",
      `Read on PlayRates: ${href}`,
    ],
  });
};
