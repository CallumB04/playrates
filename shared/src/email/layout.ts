/**
 * The pieces every PlayRates email is built from: the auth emails Supabase
 * sends (written out by scripts/emails/build.mjs) and the ones the API
 * sends. Plain strings with inline styles and tables, as mail apps need.
 *
 * Images come from the live site unless the caller names somewhere else (a
 * local stack): a mail app fetches them long after sending, from wherever
 * the reader is. Links are whatever the caller passes.
 */
import {
  CONTACT_EMAIL,
  DISCORD_INVITE_URL,
  SITE_ORIGIN,
  TIKTOK_URL,
} from "../constants/site.js";
import { igdbSized } from "../igdbImage.js";

/* Light by default: it's what every mail app draws reliably, and Gmail on
   iOS turns a dark email light anyway, shifting the purple as it goes.
   Apple Mail and Outlook honour the dark block below and get the site's
   night, from the same tokens (frontend/src/styles/theme.css). */
export const EMAIL_COLOURS = {
  page: "#f1eff7",
  paper: "#fdfcff",
  panel: "#f5f3fa",
  ink: "#0f0e12",
  body: "#46414f",
  quiet: "#635d6f",
  rule: "#e4e1ec",
  iris: "#6a44f0",
  irisSoft: "#ebe6fd",
} as const;

export const EMAIL_DARK_COLOURS = {
  page: "#0f0e12",
  paper: "#17151a",
  panel: "#1d1b22",
  ink: "#f9f8fc",
  body: "#bdb7c7",
  quiet: "#948da3",
  rule: "#2a282f",
  iris: "#9a83ff",
  irisSoft: "#2a2342",
} as const;

const C = EMAIL_COLOURS;
const D = EMAIL_DARK_COLOURS;

// Geist where the mail app loads web fonts (Apple Mail, new Outlook), the
// reader's own system face everywhere else.
export const EMAIL_SANS =
  "Geist, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const SANS = EMAIL_SANS;
const MONO =
  "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

/** The lockup's drawn size: scripts/emails/build.mjs writes it at 3x. */
const LOCKUP = { width: 128, height: 24 } as const;

/** For anything a member wrote: a username, a thread title, a list name. */
export const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const isAbsolute = (src: string | null | undefined): src is string =>
  !!src && /^https?:\/\//.test(src);

/** A paragraph. `html` is trusted: escape what goes into it. */
export const emailParagraph = (html: string, extra = "", className = "") =>
  `<p class="pr-body${className ? ` ${className}` : ""}" style="margin:0 0 18px;font-family:${SANS};font-size:16px;line-height:26px;color:${C.body};${extra}">${html}</p>`;

export const emailStrong = (html: string) =>
  `<span class="pr-ink" style="color:${C.ink};font-weight:600;">${html}</span>`;

export const emailLink = (href: string, html: string) =>
  `<a class="pr-link" href="${href}" target="_blank" style="color:${C.iris};text-decoration:underline;">${html}</a>`;

/** A small heading inside the body, for an email with sections. */
export const emailHeading = (html: string) =>
  `<h2 class="pr-ink" style="margin:32px 0 14px;font-family:${SANS};font-size:13px;line-height:18px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${C.ink};">${html}</h2>`;

/** The one thing to do. Classic Outlook draws the VML twin, which keeps the
 *  rounded corners and the padding its Word engine would otherwise drop. */
export const emailButton = (href: string, label: string) => {
  const width = Math.max(200, Math.round(label.length * 9.5 + 64));
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" class="pr-btn-wrap" style="margin:10px 0 28px;">
  <tr>
    <td class="pr-btn-cell" align="center" bgcolor="${C.iris}" style="border-radius:10px;background-color:${C.iris};">
      <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${href}" style="height:50px;v-text-anchor:middle;width:${width}px;" arcsize="20%" stroke="f" fillcolor="${C.iris}"><w:anchorlock/><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:600;">${label}</center></v:roundrect><![endif]-->
      <!--[if !mso]><!--><a class="pr-btn" href="${href}" target="_blank" style="display:inline-block;padding:14px 30px;font-family:${SANS};font-size:16px;font-weight:600;line-height:22px;color:#ffffff;text-decoration:none;border-radius:10px;border:1px solid #5733d4;">${label}</a><!--<![endif]-->
    </td>
  </tr>
</table>`;
};

/** The link written out, for a mail app that won't open the button. */
export const emailPlainLink = (href: string) =>
  `<p class="pr-muted" style="margin:0;font-family:${SANS};font-size:13px;line-height:20px;color:${C.quiet};">If the button doesn’t work, paste this into your browser:<br><a href="${href}" target="_blank" class="pr-muted" style="color:${C.quiet};text-decoration:underline;word-break:break-all;">${href}</a></p>`;

/** A quieter line under the main one: when a link runs out, what to do if
 *  it wasn't you. */
export const emailNote = (html: string) =>
  `<p class="pr-muted" style="margin:0 0 18px;font-family:${SANS};font-size:14px;line-height:22px;color:${C.quiet};">${html}</p>`;

/** What someone wrote, set apart on a tinted panel. */
export const emailQuote = (html: string) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;"><tr><td class="pr-panel" bgcolor="${C.panel}" style="background-color:${C.panel};border-radius:12px;padding:18px 22px;"><p class="pr-ink" style="margin:0;font-family:${SANS};font-size:16px;line-height:26px;color:${C.ink};">${html}</p></td></tr></table>`;

/**
 * A member's picture, or the first letter of their name on a soft disc where
 * there's none (or the mail app blocks it). `size` is what's shown; the
 * picture is drawn twice that for sharp screens.
 */
export const emailAvatar = (src: string | null, name: string, size = 56) => {
  const initial = escapeHtml((name.trim()[0] ?? "?").toUpperCase());
  const round = `border-radius:${size / 2}px;`;
  return isAbsolute(src)
    ? `<img src="${escapeHtml(src)}" width="${size}" height="${size}" alt="${escapeHtml(name)}" style="display:block;width:${size}px;height:${size}px;border:0;${round}object-fit:cover;background-color:${C.irisSoft};font-family:${SANS};font-size:12px;color:${C.quiet};">`
    : `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td class="pr-avatar" width="${size}" height="${size}" align="center" valign="middle" bgcolor="${C.irisSoft}" style="width:${size}px;height:${size}px;${round}background-color:${C.irisSoft};font-family:${SANS};font-size:${Math.round(size * 0.4)}px;font-weight:600;line-height:${size}px;color:${C.iris};">${initial}</td></tr></table>`;
};

/** Who did it, opening the email: their picture, their name, what they did. */
export const emailPerson = ({
  name,
  avatar,
  line,
}: {
  /** Plain text: escaped here. */
  name: string;
  avatar: string | null;
  /** Trusted HTML under the name. */
  line: string;
}) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;"><tr><td width="56" valign="middle" style="padding:0 16px 0 0;">${emailAvatar(avatar, name)}</td><td valign="middle"><p class="pr-ink" style="margin:0;font-family:${SANS};font-size:17px;line-height:24px;font-weight:600;color:${C.ink};">${escapeHtml(name)}</p><p class="pr-muted" style="margin:2px 0 0;font-family:${SANS};font-size:14px;line-height:20px;color:${C.quiet};">${line}</p></td></tr></table>`;

/** A game's cover at a known size: IGDB's for twice the width shown, and
 *  only an absolute address, which is all a mail app can fetch. In IGDB's
 *  own 264:374, as a mail app that ignores object-fit stretches the rest. */
const cover = (
  src: string | null,
  href: string,
  width: number,
  alt: string,
) => {
  if (!isAbsolute(src)) return "";
  const height = Math.round((width * 374) / 264);
  return `<a href="${href}" target="_blank" style="text-decoration:none;"><img src="${escapeHtml(igdbSized(src, "cover_big_2x"))}" width="${width}" height="${height}" alt="${escapeHtml(alt)}" style="display:block;width:${width}px;height:${height}px;border:0;border-radius:${width >= 80 ? 10 : 6}px;object-fit:cover;background-color:${C.rule};font-family:${SANS};font-size:12px;color:${C.quiet};"></a>`;
};

export interface EmailGame {
  href: string;
  /** Plain text: escaped here. */
  title: string;
  cover: string | null;
  /** Trusted HTML under the title. */
  meta?: string;
}

/** One game, cover first, on a panel. */
export const emailGame = (game: EmailGame) => {
  const art = cover(game.cover, game.href, 96, game.title);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;"><tr><td class="pr-panel" bgcolor="${C.panel}" style="background-color:${C.panel};border-radius:14px;padding:18px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${art ? `<td width="96" valign="top" style="padding:0 20px 0 0;">${art}</td>` : ""}<td valign="middle"><p style="margin:0;font-family:${SANS};font-size:19px;line-height:26px;font-weight:600;"><a class="pr-ink" href="${game.href}" target="_blank" style="color:${C.ink};text-decoration:none;">${escapeHtml(game.title)}</a></p>${game.meta ? `<p class="pr-muted" style="margin:6px 0 0;font-family:${SANS};font-size:14px;line-height:21px;color:${C.quiet};">${game.meta}</p>` : ""}</td></tr></table></td></tr></table>`;
};

/** Games in a list, each a small cover and a line, ruled between. */
export const emailGameRows = (games: (EmailGame & { avatar?: string })[]) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">${games
    .map((game, i) => {
      const art = cover(game.cover, game.href, 48, game.title);
      const rule = i === 0 ? "" : `border-top:1px solid ${C.rule};`;
      return `<tr><td class="pr-rule" style="${rule}padding:${i === 0 ? 0 : 14}px 0 14px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${art ? `<td width="48" valign="top" style="padding:0 16px 0 0;">${art}</td>` : ""}<td valign="middle"><p style="margin:0;font-family:${SANS};font-size:16px;line-height:23px;font-weight:600;"><a class="pr-ink" href="${game.href}" target="_blank" style="color:${C.ink};text-decoration:none;">${escapeHtml(game.title)}</a></p>${game.meta ? `<p class="pr-muted" style="margin:3px 0 0;font-family:${SANS};font-size:14px;line-height:21px;color:${C.quiet};">${game.meta}</p>` : ""}</td>${game.avatar ? `<td width="32" valign="middle" style="padding:0 0 0 12px;">${game.avatar}</td>` : ""}</tr></table></td></tr>`;
    })
    .join("")}</table>`;

/** Two to four figures side by side: what someone earned, how far along. */
export const emailStats = (stats: { value: string; label: string }[]) => {
  const width = Math.floor(100 / stats.length);
  const cells = stats
    .map(
      (s, i) =>
        `<td width="${width}%" valign="top" style="padding:18px 12px 16px ${i === 0 ? 20 : 12}px;"><p class="pr-ink pr-stat" style="margin:0;font-family:${MONO};font-size:26px;line-height:32px;font-weight:600;letter-spacing:-0.02em;color:${C.ink};">${s.value}</p><p class="pr-muted" style="margin:4px 0 0;font-family:${SANS};font-size:12px;line-height:16px;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;color:${C.quiet};">${s.label}</p></td>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;"><tr><td class="pr-panel" bgcolor="${C.panel}" style="background-color:${C.panel};border-radius:14px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${cells}</tr></table></td></tr></table>`;
};

const footLink = (href: string, label: string) =>
  `<a class="pr-muted" href="${href}" target="_blank" style="color:${C.quiet};text-decoration:underline;">${label}</a>`;

export interface EmailLayout {
  /** The line a mail app shows beside the subject. */
  preview: string;
  title: string;
  /** Built from the pieces above. */
  body: string;
  /** Why this email came. */
  reason: string;
  /** Where the site lives for links in the footer; the live site unless
   *  sending from a local stack. */
  site?: string;
  /** Where the email's own pictures and fonts are fetched from. */
  assets?: string;
  /** The footer's ways out: "Turn these off", "Email settings". */
  links?: { href: string; label: string }[];
  /** A small label over the title: "Patch notes", "Your week". */
  eyebrow?: string;
  /** Above the title, inside the card: who did it, usually. */
  lead?: string;
}

// The preview text's padding: without it a mail app fills the rest of the
// inbox line with whatever comes next, the header's alt text and so on.
const PREVIEW_PAD = "&#847;&zwnj;&nbsp;".repeat(80);

/* Its own block: Gmail drops a whole <style> it doesn't like, and the
   Outlook rules' attribute selectors are what it doesn't like. */
const outlookDark = `[data-ogsc] .pr-ink { color: ${D.ink} !important; }
  [data-ogsc] .pr-body { color: ${D.body} !important; }
  [data-ogsc] .pr-muted { color: ${D.quiet} !important; }
  [data-ogsc] .pr-link { color: ${D.iris} !important; }
  [data-ogsb] .pr-page { background-color: ${D.page} !important; }
  [data-ogsb] .pr-card { background-color: ${D.paper} !important; }
  [data-ogsb] .pr-panel { background-color: ${D.panel} !important; }`;

/**
 * Every email: the lockup over a card holding the title, what happened and
 * the one thing to do, then a footer with why this came, how to stop it and
 * how to reach us.
 */
export const emailLayout = ({
  preview,
  title,
  body,
  reason,
  site = SITE_ORIGIN,
  assets = SITE_ORIGIN,
  links = [],
  eyebrow,
  lead = "",
}: EmailLayout) => `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${title}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><style>td, p, a, h1, h2, span { font-family: Arial, sans-serif !important; }</style><![endif]-->
<style>
  @font-face { font-family: 'Geist'; font-style: normal; font-weight: 100 900; font-display: swap; src: url(${assets}/email/fonts/geist.woff2) format('woff2'); }
  @font-face { font-family: 'Geist Mono'; font-style: normal; font-weight: 100 900; font-display: swap; src: url(${assets}/email/fonts/geist-mono.woff2) format('woff2'); }
</style>
<style>
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  body { margin: 0; padding: 0; width: 100%; -webkit-text-size-adjust: 100%; }
  a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }
  @media (max-width: 620px) {
    .pr-outer { padding: 20px 10px 40px !important; }
    .pr-head { padding: 4px 14px 18px !important; }
    .pr-pad { padding: 32px 24px 30px !important; }
    .pr-title { font-size: 25px !important; line-height: 31px !important; }
    .pr-foot { padding: 26px 14px 0 !important; }
    .pr-stat { font-size: 22px !important; line-height: 28px !important; }
    .pr-btn-wrap, .pr-btn-cell { width: 100% !important; }
    .pr-btn { display: block !important; text-align: center !important; }
  }
  @media (prefers-color-scheme: dark) {
    .pr-page { background-color: ${D.page} !important; }
    .pr-card { background-color: ${D.paper} !important; border-color: ${D.rule} !important; }
    .pr-panel { background-color: ${D.panel} !important; }
    .pr-avatar { background-color: ${D.irisSoft} !important; color: ${D.iris} !important; }
    .pr-ink { color: ${D.ink} !important; }
    .pr-body { color: ${D.body} !important; }
    .pr-muted { color: ${D.quiet} !important; }
    .pr-link { color: ${D.iris} !important; }
    .pr-rule { border-color: ${D.rule} !important; }
    .pr-light { display: none !important; }
    .pr-dark { display: block !important; max-height: none !important; overflow: visible !important; }
  }
</style>
<style>
  ${outlookDark}
</style>
</head>
<body class="pr-page" style="margin:0;padding:0;background-color:${C.page};">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${preview}${PREVIEW_PAD}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="pr-page" bgcolor="${C.page}" style="background-color:${C.page};">
  <tr>
    <td class="pr-outer" align="center" style="padding:44px 16px 56px;">
      <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" lang="en" style="max-width:600px;">
        <tr>
          <td class="pr-head" style="padding:0 6px 22px;">
            <a href="${site}" target="_blank" style="text-decoration:none;">
              <img class="pr-light" src="${assets}/email/lockup-light.png" width="${LOCKUP.width}" height="${LOCKUP.height}" alt="PlayRates" style="display:block;width:${LOCKUP.width}px;height:${LOCKUP.height}px;border:0;font-family:${SANS};font-size:18px;font-weight:700;color:${C.ink};">
              <!--[if !mso]><!--><div class="pr-dark" style="display:none;max-height:0;overflow:hidden;"><img src="${assets}/email/lockup-dark.png" width="${LOCKUP.width}" height="${LOCKUP.height}" alt="PlayRates" style="display:block;width:${LOCKUP.width}px;height:${LOCKUP.height}px;border:0;font-family:${SANS};font-size:18px;font-weight:700;color:${D.ink};"></div><!--<![endif]-->
            </a>
          </td>
        </tr>
        <tr>
          <td>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="pr-card" bgcolor="${C.paper}" style="background-color:${C.paper};border:1px solid ${C.rule};border-radius:18px;border-collapse:separate;">
              <tr>
                <td class="pr-pad" style="padding:44px 48px 40px;">
                  ${lead}${
                    eyebrow
                      ? `<p class="pr-link" style="margin:0 0 12px;font-family:${SANS};font-size:12px;line-height:16px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:${C.iris};">${eyebrow}</p>`
                      : ""
                  }
                  <h1 class="pr-ink pr-title" style="margin:0 0 18px;font-family:${SANS};font-size:28px;line-height:35px;font-weight:700;letter-spacing:-0.02em;color:${C.ink};">${title}</h1>
                  ${body}
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td class="pr-foot" style="padding:30px 6px 0;font-family:${SANS};font-size:13px;line-height:20px;color:${C.quiet};">
            <p class="pr-muted" style="margin:0;font-family:${SANS};font-size:13px;line-height:20px;color:${C.quiet};">${reason}</p>${
              links.length > 0
                ? `\n            <p class="pr-muted" style="margin:6px 0 0;font-family:${SANS};font-size:13px;line-height:20px;color:${C.quiet};">${links.map((l) => footLink(l.href, l.label)).join(" &nbsp;·&nbsp; ")}</p>`
                : ""
            }
            <p class="pr-muted" style="margin:22px 0 0;font-family:${SANS};font-size:13px;line-height:20px;color:${C.quiet};">Something wrong? Email ${footLink(`mailto:${CONTACT_EMAIL}`, CONTACT_EMAIL)}, or post in the ${footLink(DISCORD_INVITE_URL, "Discord")}.</p>
            <p class="pr-muted" style="margin:6px 0 0;font-family:${SANS};font-size:13px;line-height:20px;color:${C.quiet};"><a class="pr-muted" href="${site}" target="_blank" style="color:${C.quiet};text-decoration:none;font-weight:600;">PlayRates</a> · a single home for all your games · ${footLink(TIKTOK_URL, "TikTok")}</p>
          </td>
        </tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td>
  </tr>
</table>
</body>
</html>
`;

/** The plain-text version alongside: what it says, and the same ways out. */
export const emailText = ({
  title,
  lines,
  reason,
  links = [],
}: {
  title: string;
  lines: string[];
  reason: string;
  links?: { href: string; label: string }[];
}) =>
  [
    title,
    "",
    ...lines,
    "",
    "---",
    reason,
    ...links.map((l) => `${l.label}: ${l.href}`),
    `Questions? ${CONTACT_EMAIL}`,
  ].join("\n");
