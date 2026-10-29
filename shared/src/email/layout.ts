/**
 * The pieces every PlayRates email is built from: the auth emails Supabase
 * sends (written out by scripts/emails/build.mjs) and the ones the API
 * sends. Plain strings with inline styles, as mail apps need.
 *
 * Images always come from the live site: a mail app fetches them long after
 * sending, from wherever the reader is. Links are whatever the caller passes.
 */
import {
  CONTACT_EMAIL,
  DISCORD_INVITE_URL,
  SITE_ORIGIN,
  TIKTOK_URL,
} from "../constants/site.js";

// Light by default: it's what every mail app draws reliably. Apple Mail and
// a few others honour the dark block in the layout and get the site's night.
export const EMAIL_COLOURS = {
  page: "#f4f3f7",
  paper: "#ffffff",
  ink: "#16141c",
  body: "#4a4656",
  quiet: "#7a7586",
  rule: "#e6e3ec",
  iris: "#6a44f0",
} as const;

const C = EMAIL_COLOURS;
const SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/** For anything a member wrote: a username, a thread title, a list name. */
export const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** A paragraph. `html` is trusted: escape what goes into it. */
export const emailParagraph = (html: string, extra = "", className = "") =>
  `<p${className ? ` class="${className}"` : ""} style="margin:0 0 16px;font-family:${SANS};font-size:16px;line-height:26px;color:${C.body};${extra}">${html}</p>`;

export const emailStrong = (html: string) =>
  `<span class="strong" style="color:${C.ink};font-weight:600;">${html}</span>`;

export const emailLink = (href: string, html: string) =>
  `<a href="${href}" target="_blank" style="color:${C.iris};text-decoration:underline;">${html}</a>`;

export const emailButton = (href: string, label: string) => `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" class="btn-wrap" style="margin:8px 0 24px;">
  <tr>
    <td class="btn-cell" bgcolor="${C.iris}" style="border-radius:8px;">
      <a class="btn" href="${href}" target="_blank" style="display:inline-block;padding:13px 24px;font-family:${SANS};font-size:16px;font-weight:600;line-height:22px;color:#ffffff;text-decoration:none;border-radius:8px;">${label}</a>
    </td>
  </tr>
</table>`;

/** The link written out, for a mail app that won't open the button. */
export const emailPlainLink = (href: string) =>
  emailParagraph(
    `If the button doesn't work, copy this link into your browser:<br><a href="${href}" target="_blank" class="muted-link" style="color:${C.quiet};text-decoration:underline;word-break:break-all;">${href}</a>`,
    `font-size:13px;line-height:20px;color:${C.quiet};`,
    "small",
  );

const social = (href: string, icon: string, label: string) =>
  `<a href="${href}" target="_blank" style="display:inline-block;margin-right:14px;text-decoration:none;"><img src="${SITE_ORIGIN}/email/${icon}.png" width="20" height="20" alt="${label}" style="display:block;border:0;"></a>`;

const footLink = (href: string, label: string) =>
  `<a href="${href}" target="_blank" style="color:${C.quiet};text-decoration:underline;">${label}</a>`;

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
  /** The footer's ways out: "Turn these off", "Email settings". */
  links?: { href: string; label: string }[];
}

/**
 * Every email: the mark and name, a title, what happened and what to do,
 * then a footer with how to reach us, why this came, and how to stop it.
 */
export const emailLayout = ({
  preview,
  title,
  body,
  reason,
  site = SITE_ORIGIN,
  links = [],
}: EmailLayout) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${title}</title>
<style>
  @media (max-width: 600px) {
    .outer { padding: 16px 0 32px !important; }
    .paper { border-radius: 0 !important; border-left: 0 !important; border-right: 0 !important; padding: 28px 22px !important; }
    .foot { padding: 24px 22px 0 !important; }
    .title { font-size: 22px !important; line-height: 30px !important; }
    .btn-wrap, .btn-cell { width: 100% !important; }
    .btn { display: block !important; text-align: center !important; }
  }
  @media (prefers-color-scheme: dark) {
    .page { background-color: #0f0e12 !important; }
    .paper { background-color: #1b1921 !important; border-color: #2c2935 !important; }
    .title, .strong { color: #f4f2f8 !important; }
    .text, .text p { color: #c3bdd0 !important; }
    .text p.small, .muted-link { color: #8f89a0 !important; }
    .rule { border-color: #2c2935 !important; }
    .wordmark { color: #f4f2f8 !important; }
  }
</style>
</head>
<body class="page" style="margin:0;padding:0;background-color:${C.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preview}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="page" bgcolor="${C.page}" style="background-color:${C.page};">
  <tr>
    <td class="outer" align="center" style="padding:40px 16px 48px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
        <tr>
          <td class="paper text" bgcolor="${C.paper}" style="background-color:${C.paper};border:1px solid ${C.rule};border-radius:12px;padding:36px 40px 20px;">
            <a href="${site}" target="_blank" style="text-decoration:none;">
              <img src="${SITE_ORIGIN}/logo.png" width="28" height="28" alt="" style="display:inline-block;vertical-align:middle;border:0;border-radius:7px;">
              <span class="wordmark" style="display:inline-block;vertical-align:middle;margin-left:8px;font-family:${SANS};font-size:16px;font-weight:700;color:${C.ink};">PlayRates</span>
            </a>
            <h1 class="title" style="margin:32px 0 14px;font-family:${SANS};font-size:24px;line-height:32px;font-weight:700;color:${C.ink};">${title}</h1>
            ${body}
          </td>
        </tr>
        <tr>
          <td class="foot" style="padding:28px 40px 0;font-family:${SANS};font-size:13px;line-height:20px;color:${C.quiet};">
            <p style="margin:0 0 14px;">Questions, or something not right? Email <a href="mailto:${CONTACT_EMAIL}" style="color:${C.quiet};text-decoration:underline;">${CONTACT_EMAIL}</a> or come and say hi on Discord.</p>
            <p style="margin:0 0 18px;">${social(DISCORD_INVITE_URL, "discord", "PlayRates on Discord")}${social(TIKTOK_URL, "tiktok", "PlayRates on TikTok")}</p>
            <p style="margin:0;">${reason}</p>${
              links.length > 0
                ? `\n            <p style="margin:6px 0 0;">${links.map((l) => footLink(l.href, l.label)).join(" · ")}</p>`
                : ""
            }
            <p style="margin:6px 0 0;"><a href="${site}" target="_blank" style="color:${C.quiet};text-decoration:none;">PlayRates</a> · a single home for all your games</p>
          </td>
        </tr>
      </table>
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
