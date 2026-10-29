// Writes the auth emails Supabase sends to supabase/templates/, from one
// layout, and the footer's social icons to frontend/public/email/. Run after
// changing any of them: `node scripts/emails/build.mjs`.
// The templates are what the local stack sends (supabase/config.toml points
// at them) and what gets pasted into the live project's email templates.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(resolve(root, "backend/package.json"));
const { Resvg } = require("@resvg/resvg-js");

const SITE = "https://playrates.app";
const CONTACT = "hello@playrates.app";
const DISCORD = "https://discord.gg/YKgDe6YFz8";
const TIKTOK = "https://www.tiktok.com/@playratesapp";

// Light by default: it's what every mail app draws reliably. Apple Mail and
// a few others honour the dark block below and get the site's own night.
const PAGE = "#f4f3f7";
const PAPER = "#ffffff";
const INK = "#16141c";
const BODY = "#4a4656";
const QUIET = "#7a7586";
const RULE = "#e6e3ec";
const IRIS = "#6a44f0";

const SANS =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/* ------------------------------------------------------------- icons */

// The footer's icons as PNGs: Gmail and Outlook don't draw SVG. From the
// same Simple Icons set the site's footer uses, in the footer's grey.
const ICONS = { discord: "SiDiscord", tiktok: "SiTiktok" };
const iconsOut = resolve(root, "frontend/public/email");
mkdirSync(iconsOut, { recursive: true });
for (const [name, component] of Object.entries(ICONS)) {
    const source = readFileSync(
        resolve(
            root,
            `node_modules/@icons-pack/react-simple-icons/icons/${component}.mjs`
        ),
        "utf8"
    );
    const path = source.match(/d: "([^"]+)"/)?.[1];
    if (!path) throw new Error(`No path in ${component}`);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${QUIET}"><path d="${path}"/></svg>`;
    // Drawn at three times the size shown, for sharp screens.
    const png = new Resvg(svg, { fitTo: { mode: "width", value: 60 } })
        .render()
        .asPng();
    writeFileSync(resolve(iconsOut, `${name}.png`), png);
    console.log(`wrote frontend/public/email/${name}.png`);
}

/* ------------------------------------------------------------ pieces */

const p = (html, extra = "", className = "") =>
    `<p${className ? ` class="${className}"` : ""} style="margin:0 0 16px;font-family:${SANS};font-size:16px;line-height:26px;color:${BODY};${extra}">${html}</p>`;

const button = (href, label) => `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" class="btn-wrap" style="margin:8px 0 24px;">
  <tr>
    <td class="btn-cell" bgcolor="${IRIS}" style="border-radius:8px;">
      <a class="btn" href="${href}" target="_blank" style="display:inline-block;padding:13px 24px;font-family:${SANS};font-size:16px;font-weight:600;line-height:22px;color:#ffffff;text-decoration:none;border-radius:8px;">${label}</a>
    </td>
  </tr>
</table>`;

/** The link written out, for a mail app that won't open the button. */
const plainLink = (href) =>
    p(
        `If the button doesn't work, copy this link into your browser:<br><a href="${href}" target="_blank" class="muted-link" style="color:${QUIET};text-decoration:underline;word-break:break-all;">${href}</a>`,
        `font-size:13px;line-height:20px;color:${QUIET};`,
        "small"
    );

const social = (href, icon, label) =>
    `<a href="${href}" target="_blank" style="display:inline-block;margin-right:14px;text-decoration:none;"><img src="${SITE}/email/${icon}.png" width="20" height="20" alt="${label}" style="display:block;border:0;"></a>`;

/**
 * Every email: the mark and name, a title, what happened and what to do,
 * then a footer with how to reach us and why this came.
 */
const layout = ({ preview, title, body, reason }) => `<!DOCTYPE html>
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
<body class="page" style="margin:0;padding:0;background-color:${PAGE};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preview}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="page" bgcolor="${PAGE}" style="background-color:${PAGE};">
  <tr>
    <td class="outer" align="center" style="padding:40px 16px 48px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
        <tr>
          <td class="paper text" bgcolor="${PAPER}" style="background-color:${PAPER};border:1px solid ${RULE};border-radius:12px;padding:36px 40px 20px;">
            <a href="${SITE}" target="_blank" style="text-decoration:none;">
              <img src="${SITE}/logo.png" width="28" height="28" alt="" style="display:inline-block;vertical-align:middle;border:0;border-radius:7px;">
              <span class="wordmark" style="display:inline-block;vertical-align:middle;margin-left:8px;font-family:${SANS};font-size:16px;font-weight:700;color:${INK};">PlayRates</span>
            </a>
            <h1 class="title" style="margin:32px 0 14px;font-family:${SANS};font-size:24px;line-height:32px;font-weight:700;color:${INK};">${title}</h1>
            ${body}
          </td>
        </tr>
        <tr>
          <td class="foot" style="padding:28px 40px 0;font-family:${SANS};font-size:13px;line-height:20px;color:${QUIET};">
            <p style="margin:0 0 14px;">Questions, or something not right? Email <a href="mailto:${CONTACT}" style="color:${QUIET};text-decoration:underline;">${CONTACT}</a> or come and say hi on Discord.</p>
            <p style="margin:0 0 18px;">${social(DISCORD, "discord", "PlayRates on Discord")}${social(TIKTOK, "tiktok", "PlayRates on TikTok")}</p>
            <p style="margin:0;">${reason}</p>
            <p style="margin:6px 0 0;"><a href="${SITE}" target="_blank" style="color:${QUIET};text-decoration:none;">PlayRates</a> · a single home for all your games</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>
`;

const strong = (text) =>
    `<span class="strong" style="color:${INK};font-weight:600;">${text}</span>`;

/* ------------------------------------------------------------ emails */

const IF_NOT_YOU = `If it wasn't you, reset your password straight away with Forgot password on the sign-in screen, and email us at <a href="mailto:${CONTACT}" style="color:${IRIS};text-decoration:underline;">${CONTACT}</a>.`;

const EMAILS = {
    confirmation: layout({
        preview: "One last step to set up your account.",
        title: "Confirm your email",
        body: [
            p(
                `Hi ${strong("{{ .Data.username }}")}, thanks for joining PlayRates. Confirm this address to finish setting up your account.`
            ),
            button("{{ .ConfirmationURL }}", "Confirm email"),
            plainLink("{{ .ConfirmationURL }}"),
        ].join("\n"),
        reason: "You're getting this because {{ .Email }} was used to sign up. If that wasn't you, ignore it and no account will be made.",
    }),

    recovery: layout({
        preview: "Choose a new password for your account.",
        title: "Reset your password",
        body: [
            p(
                `We got a request to reset the password for ${strong("{{ .Email }}")}. Choose a new one with the button below.`
            ),
            button("{{ .ConfirmationURL }}", "Reset password"),
            plainLink("{{ .ConfirmationURL }}"),
        ].join("\n"),
        reason: "If you didn't ask for this, ignore it. Your password won't change.",
    }),

    email_change: layout({
        preview: "Confirm the new email on your account.",
        title: "Confirm your new email",
        body: [
            p(
                `You asked to change the email on your PlayRates account from ${strong("{{ .Email }}")} to ${strong("{{ .NewEmail }}")}.`
            ),
            button("{{ .ConfirmationURL }}", "Confirm change"),
            plainLink("{{ .ConfirmationURL }}"),
        ].join("\n"),
        reason: "If you didn't ask for this, ignore it and nothing will change.",
    }),

    password_changed_notification: layout({
        preview: "The password on your account was just changed.",
        title: "Your password was changed",
        body: [
            p(
                `The password for ${strong("{{ .Email }}")} was changed just now. If this was you, there's nothing else to do.`
            ),
            p(IF_NOT_YOU),
        ].join("\n"),
        reason: "We send this whenever your password changes, to help keep your account safe.",
    }),

    email_changed_notification: layout({
        preview: "The email on your account was just changed.",
        title: "Your email was changed",
        body: [
            p(
                `The email on your PlayRates account was changed from ${strong("{{ .OldEmail }}")} to ${strong("{{ .Email }}")}. If this was you, there's nothing else to do.`
            ),
            p(IF_NOT_YOU),
        ].join("\n"),
        reason: "We send this to your old address whenever your email changes, to help keep your account safe.",
    }),
};

const out = resolve(root, "supabase/templates");
mkdirSync(out, { recursive: true });
for (const [name, html] of Object.entries(EMAILS)) {
    writeFileSync(resolve(out, `${name}.html`), html);
    console.log(`wrote supabase/templates/${name}.html`);
}
