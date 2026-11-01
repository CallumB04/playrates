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
  paragraphsOf,
  PATCH_NOTE_KIND_NAMES,
  type PatchNote,
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
  milestones:
    "You're getting this because you have reaction and love emails on.",
  gifts_invites:
    "You're getting this because you have gift and invite emails on.",
  wishlist_releases:
    "You're getting this because you have wishlist release emails on.",
  news: "You're getting this because you have news emails on.",
  reminders:
    "You're getting this because you turned on streak and task reminder emails.",
  digest: "You're getting this because you have the weekly digest on.",
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
  if (item === "slot_pinned_list") return `${profile}?edit=pinned_lists`;
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
        `${emailStrong(escapeHtml(data.giver))} gifted you ${escapeHtml(item)}.`,
      ),
      emailButton(href, "Use your gift"),
      emailPlainLink(href),
    ].join("\n"),
    lines: [
      `${data.giver} gifted you ${item}.`,
      "",
      `Use your gift: ${href}`,
    ],
  });
};

/* -------------------------------------------------------------- invites */

export const inviteJoinedEmail = (
  data: { username: string; xp: number; tokens: number },
  links: EmailLinks,
): RenderedEmail => {
  const href = url(links, `/user/${encodeURIComponent(data.username)}`);
  const name = escapeHtml(data.username);
  const reward = `${data.xp} XP and ${data.tokens} tokens`;
  return build({
    scope: "gifts_invites",
    links,
    subject: `${data.username} joined PlayRates from your invite`,
    preview: `You've earned ${reward} for the invite.`,
    title: `${data.username} joined from your invite`,
    body: [
      emailParagraph(
        `${emailStrong(name)} signed up and said you sent them. You've earned ${emailStrong(reward)}.`,
      ),
      emailButton(href, "See their profile"),
      emailPlainLink(href),
    ].join("\n"),
    lines: [
      `${data.username} signed up and said you sent them. You've earned ${reward}.`,
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

/* ------------------------------------------------------- friend accepted */

export const friendAcceptedEmail = (
  data: { actor: string; actorAvatar: string | null },
  links: EmailLinks,
): RenderedEmail => {
  const href = url(links, `/user/${encodeURIComponent(data.actor)}`);
  const title = `${data.actor} accepted your friend request`;
  const line = `You and ${data.actor} are friends on PlayRates now.`;
  return build({
    scope: "friend_requests",
    links,
    subject: title,
    preview: line,
    title,
    body: [
      avatar(data.actorAvatar, data.actor),
      emailParagraph(escapeHtml(line)),
      emailButton(href, "See their profile"),
      emailPlainLink(href),
    ].join("\n"),
    lines: [line, "", `See their profile: ${href}`],
  });
};

/* ----------------------------------------------------------- milestones */

/** What reached a milestone, and where it lives. */
export type MilestoneSubject =
  | { kind: "message"; threadId: number; messageId: number; threadTitle: string; excerpt: string }
  | { kind: "review"; gameId: number; reviewId: number; gameTitle: string }
  | { kind: "list"; listId: number; listName: string; username: string }
  | { kind: "gaming25"; username: string };

export const milestoneEmail = (
  data: { milestone: number; subject: MilestoneSubject },
  links: EmailLinks,
): RenderedEmail => {
  const s = data.subject;
  const n = data.milestone;
  const { title, href, label } =
    s.kind === "message"
      ? {
          title: `${n} reactions on your message in ${s.threadTitle}`,
          href: `/community/thread/${s.threadId}#message-${s.messageId}`,
          label: "See your message",
        }
      : s.kind === "review"
        ? {
            title: `${n} reactions on your review of ${s.gameTitle}`,
            href: `/game/${s.gameId}#review-${s.reviewId}`,
            label: "See your review",
          }
        : s.kind === "list"
          ? {
              title: `${n} loves on your list ${s.listName}`,
              href: `/user/${encodeURIComponent(s.username)}/lists/${s.listId}`,
              label: "See your list",
            }
          : {
              title: `${n} loves on your Gaming 25`,
              href: `/user/${encodeURIComponent(s.username)}/gaming-25`,
              label: "See your Gaming 25",
            };
  const link = url(links, href);
  const excerpt = s.kind === "message" ? s.excerpt : "";
  return build({
    scope: "milestones",
    links,
    subject: clip(title, 90),
    preview: excerpt || title,
    title,
    body: [
      excerpt ? quote(excerpt) : "",
      emailButton(link, label),
      emailPlainLink(link),
    ].join("\n"),
    lines: [...(excerpt ? [`"${excerpt}"`, ""] : []), `${label}: ${link}`],
  });
};

/* ------------------------------------------------------------ reminders */

/** The day a period ends on, in the member's own zone: the bell's "by
 *  Monday" means before Monday starts. */
export const endDay = (endsAt: string, zone: string | null): string => {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      timeZone: zone ?? "UTC",
    }).format(new Date(endsAt));
  } catch {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      timeZone: "UTC",
    }).format(new Date(endsAt));
  }
};

export const streakEmail = (
  data: { weeks: number; shield: boolean; day: string },
  links: EmailLinks,
): RenderedEmail => {
  const title = `Your ${data.weeks} week streak needs something by ${data.day}`;
  const body = data.shield
    ? "If not, a shield will keep it going."
    : "Log, rate, review or post anything to keep it.";
  const href = url(links, "/progress#streak");
  return build({
    scope: "reminders",
    links,
    subject: title,
    preview: body,
    title,
    body: [
      emailParagraph(body),
      emailButton(href, "See your streak"),
      emailPlainLink(href),
    ].join("\n"),
    lines: [body, "", `See your streak: ${href}`],
  });
};

export const taskEmail = (
  data: {
    label: string;
    count: number;
    target: number;
    xp: number;
    tokens: number;
    day: string;
  },
  links: EmailLinks,
): RenderedEmail => {
  const title = `Nearly there: ${data.label}`;
  const progress = `${data.count} of ${data.target}, ends ${data.day}.`;
  const reward = `Finish it for ${data.xp} XP and ${data.tokens} tokens.`;
  const href = url(links, "/progress");
  return build({
    scope: "reminders",
    links,
    subject: clip(title, 80),
    preview: progress,
    title,
    body: [
      emailParagraph(escapeHtml(progress)),
      emailParagraph(escapeHtml(reward)),
      emailButton(href, "See your tasks"),
      emailPlainLink(href),
    ].join("\n"),
    lines: [progress, reward, "", `See your tasks: ${href}`],
  });
};

/* --------------------------------------------------------------- digest */

export interface DigestContent {
  friends: {
    username: string;
    gameId: number;
    title: string;
    status: "played" | "playing" | "backlog";
    rating: number | null;
  }[];
  releases: { gameId: number; title: string; releaseDate: string }[];
  logged: number;
}

/** The words either side of the game's title. */
const DID: Record<
  DigestContent["friends"][number]["status"],
  [string, string]
> = {
  played: ["played", ""],
  playing: ["is playing", ""],
  backlog: ["added", " to their backlog"],
};

/** "2026-11-06" as "Thursday 6 Nov": a date, not a moment, so read as UTC. */
const releaseDay = (date: string) =>
  new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

export const digestEmail = (
  data: DigestContent,
  links: EmailLinks,
): RenderedEmail => {
  const game = (id: number) => url(links, `/game/${id}`);
  const rated = (f: DigestContent["friends"][number]) =>
    f.rating === null ? "" : `, rated ${f.rating}/10`;
  const friendLine = (f: DigestContent["friends"][number]) =>
    `${f.username} ${DID[f.status][0]} ${f.title}${DID[f.status][1]}${rated(f)}`;
  const people = new Set(data.friends.map((f) => f.username)).size;

  const summary = [
    data.friends.length > 0 &&
      `${plural(people, "friend", "friends")} played something this week.`,
    data.releases.length > 0 &&
      `${plural(data.releases.length, "game", "games")} on your wishlist ${data.releases.length === 1 ? "comes" : "come"} out this week.`,
    data.logged > 0 && `You logged ${plural(data.logged, "game", "games")}.`,
  ].filter((line): line is string => Boolean(line));

  const html: string[] = [];
  const lines: string[] = [];
  if (data.friends.length > 0) {
    html.push(emailParagraph(emailStrong("What your friends played")));
    lines.push("What your friends played");
    for (const f of data.friends) {
      html.push(
        emailParagraph(
          `${escapeHtml(f.username)} ${DID[f.status][0]} ${emailLink(game(f.gameId), escapeHtml(f.title))}${DID[f.status][1]}${rated(f)}`,
          "margin:0 0 8px;",
        ),
      );
      lines.push(`- ${friendLine(f)}: ${game(f.gameId)}`);
    }
    lines.push("");
  }
  if (data.releases.length > 0) {
    html.push(emailParagraph(emailStrong("Out this week from your wishlist")));
    lines.push("Out this week from your wishlist");
    for (const r of data.releases) {
      html.push(
        emailParagraph(
          `${emailLink(game(r.gameId), escapeHtml(r.title))}, ${releaseDay(r.releaseDate)}`,
          "margin:0 0 8px;",
        ),
      );
      lines.push(`- ${r.title}, ${releaseDay(r.releaseDate)}: ${game(r.gameId)}`);
    }
    lines.push("");
  }
  if (data.logged > 0) {
    html.push(
      emailParagraph(
        `${emailStrong("Your week")}<br>You logged ${plural(data.logged, "game", "games")}.`,
      ),
    );
    lines.push("Your week", `You logged ${plural(data.logged, "game", "games")}.`, "");
  }
  const home = url(links, "/");
  return build({
    scope: "digest",
    links,
    subject: "Your week on PlayRates",
    preview: summary.join(" "),
    title: "Your week on PlayRates",
    body: [...html, emailButton(home, "Open PlayRates")].join("\n"),
    lines: [...lines, `Open PlayRates: ${home}`],
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
      text: "Add what you've played and what you want to play.",
      path: "/library",
    },
    {
      title: "Add your friends",
      text: "Find people you know and see what they're playing.",
      path: "/community",
    },
    {
      title: "Make your Gaming 25",
      text: "Pick a game for each of 25 categories.",
      path: `/user/${encodeURIComponent(data.username)}/gaming-25`,
    },
  ];
  const name = data.firstName?.trim() || data.username;
  const href = url(links, "/library");
  return build({
    scope: "all",
    links,
    subject: "Welcome to PlayRates",
    preview: "Your account is ready.",
    title: `Welcome to PlayRates, ${name}`,
    body: [
      emailParagraph("Your account is ready. Try these first:"),
      ...steps.map((s, i) =>
        emailParagraph(
          `${emailStrong(`${i + 1}. ${emailLink(url(links, s.path), escapeHtml(s.title))}`)}<br>${escapeHtml(s.text)}`,
        ),
      ),
      emailButton(href, "Log your first games"),
      emailPlainLink(href),
    ].join("\n"),
    lines: [
      "Your account is ready. Try these first:",
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
      href ? emailButton(escapeHtml(href), "Open PlayRates") : "",
      href ? emailPlainLink(escapeHtml(href)) : "",
    ].join("\n"),
    lines: [text, ...(href ? ["", `Open PlayRates: ${href}`] : [])],
  });
};

/* ---------------------------------------------------------- patch notes */

/** A release's changes as the email shows them: one list in the order
 *  written, each change named by its kind, and linked where it has one. */
const patchNoteHtml = (note: PatchNote, links: EmailLinks): string => {
  const items = note.items
    .map((item) => {
      const text = escapeHtml(item.text);
      const kind = emailStrong(`${PATCH_NOTE_KIND_NAMES[item.kind]}:`);
      return `<li style="margin:0 0 6px;">${kind} ${
        item.link
          ? emailLink(escapeHtml(absolute(links, item.link)), text)
          : text
      }</li>`;
    })
    .join("");
  return [
    ...paragraphsOf(note.intro).map((p) => emailParagraph(escapeHtml(p))),
    items
      ? `<ul class="text" style="margin:0 0 16px;padding-left:24px;font-family:${SANS};font-size:16px;line-height:26px;color:${C.body};">${items}</ul>`
      : "",
    ...paragraphsOf(note.outro).map((p) => emailParagraph(escapeHtml(p))),
  ].join("\n");
};

const patchNoteText = (note: PatchNote, links: EmailLinks): string[] => [
  ...paragraphsOf(note.intro).flatMap((p) => [p, ""]),
  ...note.items.map(
    (item) =>
      `- ${PATCH_NOTE_KIND_NAMES[item.kind]}: ${item.text}${item.link ? ` (${absolute(links, item.link)})` : ""}`,
  ),
  ...(note.items.length > 0 ? [""] : []),
  ...paragraphsOf(note.outro).flatMap((p) => [p, ""]),
];

export const patchNotesEmail = (
  data: {
    /** What the bell says: "New patch notes: v1.1". */
    subject: string;
    title: string | null;
    doc: RichTextDoc;
    /** The release as written, where it was: its links survive. */
    note?: PatchNote | null;
    link: string;
  },
  links: EmailLinks,
): RenderedEmail => {
  const href = absolute(links, data.link);
  const note = data.note ?? null;
  const title = note?.title ?? data.title ?? "New patch notes";
  const options = { skipFirstHeading: data.title !== null };
  return build({
    scope: "news",
    links,
    subject: data.subject,
    preview: "The latest changes to PlayRates.",
    title,
    body: [
      eyebrow("Patch notes"),
      note
        ? patchNoteHtml(note, links)
        : richTextToEmailHtml(data.doc, options),
      emailButton(escapeHtml(href), "Read on PlayRates"),
      emailPlainLink(escapeHtml(href)),
    ].join("\n"),
    lines: [
      ...(note
        ? patchNoteText(note, links)
        : [...richTextToEmailText(data.doc, options), ""]),
      `Read on PlayRates: ${href}`,
    ],
  });
};

/* ---------------------------------------------------------------- alert */

export type AlertContent =
  | { kind: "job"; job: string; failures: { part: string; message: string }[] }
  | { kind: "spike"; errors: "server" | "client"; count: number };

const ALERT_REASON = "You're getting this because you're a PlayRates admin.";

/** To the admins only, so no way out: it stops when they stop being one. */
export const alertEmail = (
  content: AlertContent,
  site: string,
): RenderedEmail => {
  const health = `${site}/admin/health`;
  const title =
    content.kind === "job"
      ? `${content.job} failed`
      : `${content.count} ${content.errors === "server" ? "failed requests" : "browser errors"} in the last hour`;
  const lines =
    content.kind === "job"
      ? [
          "These parts of it stopped with an error:",
          ...content.failures.map((f) => `${f.part}: ${f.message}`),
          "Everything else in it ran as normal, and it runs again tomorrow.",
        ]
      : [
          "More than usual. The newest are on the Health page, with their stacks.",
          "You won't hear about this again for six hours.",
        ];
  const html = [
    ...lines.map((line, i) =>
      content.kind === "job" && i > 0 && i <= content.failures.length
        ? emailParagraph(
            `${emailStrong(escapeHtml(content.failures[i - 1]!.part))}: ${escapeHtml(content.failures[i - 1]!.message)}`,
            `padding:4px 0 4px 14px;border-left:3px solid ${C.rule};`,
          )
        : emailParagraph(escapeHtml(line)),
    ),
    emailButton(escapeHtml(health), "Open Health"),
  ].join("\n");
  const footer = [{ href: health, label: "Health" }];
  return {
    subject: `PlayRates alert: ${title.charAt(0).toLowerCase()}${title.slice(1)}`,
    html: emailLayout({
      preview: escapeHtml(lines[0]!),
      title: escapeHtml(title),
      body: html,
      reason: ALERT_REASON,
      site,
      links: footer,
    }),
    text: emailText({
      title,
      lines: [...lines, "", `Open Health: ${health}`],
      reason: ALERT_REASON,
      links: footer,
    }),
  };
};
