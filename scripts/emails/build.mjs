// Writes the auth emails Supabase sends to supabase/templates/, from the
// shared email layout (shared/src/email/layout.ts, the one the API's own
// emails use), and the footer's social icons to frontend/public/email/. Run
// after changing any of them, with shared built:
// `npm run build -w shared && node scripts/emails/build.mjs`.
// The templates are what the local stack sends (supabase/config.toml points
// at them) and what gets pasted into the live project's email templates.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(resolve(root, "backend/package.json"));
const { Resvg } = require("@resvg/resvg-js");

const {
  CONTACT_EMAIL: CONTACT,
  EMAIL_COLOURS,
  emailButton: button,
  emailLayout,
  emailParagraph: p,
  emailPlainLink: plainLink,
  emailStrong: strong,
} = await import("@playrates/shared");

const QUIET = EMAIL_COLOURS.quiet;
const IRIS = EMAIL_COLOURS.iris;
const layout = emailLayout;

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
      `node_modules/@icons-pack/react-simple-icons/icons/${component}.mjs`,
    ),
    "utf8",
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

/* ------------------------------------------------------------ emails */

const IF_NOT_YOU = `If it wasn't you, reset your password straight away with Forgot password on the sign-in screen, and email us at <a href="mailto:${CONTACT}" style="color:${IRIS};text-decoration:underline;">${CONTACT}</a>.`;

const EMAILS = {
  confirmation: layout({
    preview: "Confirm your email address.",
    title: "Confirm your email",
    body: [
      p(
        `Hi ${strong("{{ .Data.username }}")}, thanks for joining PlayRates. Confirm this address to finish setting up your account.`,
      ),
      button("{{ .ConfirmationURL }}", "Confirm email"),
      plainLink("{{ .ConfirmationURL }}"),
    ].join("\n"),
    reason:
      "You're getting this because {{ .Email }} was used to sign up. If that wasn't you, ignore it and no account will be made.",
  }),

  recovery: layout({
    preview: "Choose a new password for your account.",
    title: "Reset your password",
    body: [
      p(
        `We got a request to reset the password for ${strong("{{ .Email }}")}. Choose a new one with the button below.`,
      ),
      button("{{ .ConfirmationURL }}", "Reset password"),
      plainLink("{{ .ConfirmationURL }}"),
    ].join("\n"),
    reason:
      "If you didn't ask for this, ignore it. Your password won't change.",
  }),

  email_change: layout({
    preview: "Confirm the new email on your account.",
    title: "Confirm your new email",
    body: [
      p(
        `You asked to change the email on your PlayRates account from ${strong("{{ .Email }}")} to ${strong("{{ .NewEmail }}")}.`,
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
        `The password for ${strong("{{ .Email }}")} was changed just now. If this was you, there's nothing else to do.`,
      ),
      p(IF_NOT_YOU),
    ].join("\n"),
    reason:
      "We send this whenever your password changes, to help keep your account safe.",
  }),

  email_changed_notification: layout({
    preview: "The email on your account was just changed.",
    title: "Your email was changed",
    body: [
      p(
        `The email on your PlayRates account was changed from ${strong("{{ .OldEmail }}")} to ${strong("{{ .Email }}")}. If this was you, there's nothing else to do.`,
      ),
      p(IF_NOT_YOU),
    ].join("\n"),
    reason:
      "We send this to your old address whenever your email changes, to help keep your account safe.",
  }),
};

const out = resolve(root, "supabase/templates");
mkdirSync(out, { recursive: true });
for (const [name, html] of Object.entries(EMAILS)) {
  writeFileSync(resolve(out, `${name}.html`), html);
  console.log(`wrote supabase/templates/${name}.html`);
}
