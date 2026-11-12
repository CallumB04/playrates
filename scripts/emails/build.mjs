// Writes the auth emails Supabase sends to supabase/templates/, from the
// shared email layout (shared/src/email/layout.ts, the one the API's own
// emails use), and the pictures and fonts emails load to
// frontend/public/email/. Run after changing any of them, with shared built:
// `npm run build -w shared && node scripts/emails/build.mjs`.
// The templates are what the local stack sends (supabase/config.toml points
// at them) and what gets pasted into the live project's email templates.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(resolve(root, "backend/package.json"));
const { Resvg } = require("@resvg/resvg-js");
const { default: satori } = await import("satori");
// The backend's own unpacker: satori draws a WOFF font's every letter as a
// box (see the comment there).
const { woffToSfnt } = await import("../../backend/src/lib/woff.ts");

const {
  CONTACT_EMAIL: CONTACT,
  EMAIL_COLOURS,
  EMAIL_DARK_COLOURS,
  emailButton: button,
  emailLayout,
  emailNote: note,
  emailParagraph: p,
  emailPlainLink: plainLink,
  emailStrong: strong,
} = await import("@playrates/shared");

const IRIS = EMAIL_COLOURS.iris;
const layout = emailLayout;

/* ------------------------------------------------------------- icons */

// The footer's old social icons, kept drawn for the emails already sitting
// in inboxes that still load them. From the same Simple Icons set the
// site's footer uses.
const ICONS = { discord: "SiDiscord", tiktok: "SiTiktok" };
const ICON_GREY = "#7a7586";
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
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${ICON_GREY}"><path d="${path}"/></svg>`;
  // Drawn at three times the size shown, for sharp screens.
  const png = new Resvg(svg, { fitTo: { mode: "width", value: 60 } })
    .render()
    .asPng();
  writeFileSync(resolve(iconsOut, `${name}.png`), png);
  console.log(`wrote frontend/public/email/${name}.png`);
}

/* ------------------------------------------------------------ lockup */

// The mark beside the name, as frontend/scripts/brand-assets.mjs draws it,
// once in ink for a light email and once in white for a dark one. PNG at
// three times the 24px it's shown at: mail apps don't draw SVG.
const SHOWN = 24;
const DRAWN = SHOWN * 3;
const geist = (weight) =>
  woffToSfnt(
    readFileSync(
      resolve(
        root,
        `node_modules/@fontsource/geist/files/geist-latin-${weight}-normal.woff`,
      ),
    ),
  );
const markSrc = `data:image/svg+xml;base64,${readFileSync(
  resolve(root, "frontend/public/favicon.svg"),
).toString("base64")}`;
const el = (type, style, children) => ({
  type,
  props: { style: { display: "flex", ...style }, children },
});

const lockupPng = async (color) => {
  const svg = await satori(
    el("div", { alignItems: "center", gap: DRAWN * 0.32, height: DRAWN }, [
      {
        type: "img",
        props: {
          src: markSrc,
          width: DRAWN,
          height: DRAWN,
          style: { borderRadius: DRAWN * 0.23 },
        },
      },
      el(
        "div",
        {
          fontFamily: "Geist",
          fontSize: DRAWN * 0.86,
          fontWeight: 700,
          letterSpacing: DRAWN * -0.03,
          lineHeight: 1,
          color,
        },
        "PlayRates",
      ),
    ]),
    {
      width: DRAWN * 8,
      height: DRAWN,
      fonts: [
        { name: "Geist", data: geist(700), weight: 700, style: "normal" },
      ],
    },
  );
  const image = new Resvg(svg).render();
  // Cropped to the last column with anything in it, so the width the
  // layout gives it is the lockup's own.
  let right = 0;
  for (let x = image.width - 1; x >= 0 && right === 0; x--) {
    for (let y = 0; y < image.height; y++) {
      if (image.pixels[(y * image.width + x) * 4 + 3] > 0) {
        right = x + 1;
        break;
      }
    }
  }
  const cropped = new Resvg(
    svg.replace(
      `width="${DRAWN * 8}" height="${DRAWN}" viewBox="0 0 ${DRAWN * 8} ${DRAWN}"`,
      `width="${right}" height="${DRAWN}" viewBox="0 0 ${right} ${DRAWN}"`,
    ),
  )
    .render()
    .asPng();
  return { png: cropped, shownWidth: Math.round((right / DRAWN) * SHOWN) };
};

for (const [name, color] of [
  ["lockup-light", EMAIL_COLOURS.ink],
  ["lockup-dark", EMAIL_DARK_COLOURS.ink],
]) {
  const { png, shownWidth } = await lockupPng(color);
  writeFileSync(resolve(iconsOut, `${name}.png`), png);
  console.log(
    `wrote frontend/public/email/${name}.png (shown at ${shownWidth}x${SHOWN}: LOCKUP in layout.ts)`,
  );
}

/* ------------------------------------------------------------- fonts */

// Geist for the mail apps that load web fonts. Its own copy at a fixed
// address: the site's are renamed by every build.
const fontsOut = resolve(iconsOut, "fonts");
mkdirSync(fontsOut, { recursive: true });
for (const [from, to] of [
  [
    "@fontsource-variable/geist/files/geist-latin-wght-normal.woff2",
    "geist.woff2",
  ],
  [
    "@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2",
    "geist-mono.woff2",
  ],
]) {
  copyFileSync(resolve(root, "node_modules", from), resolve(fontsOut, to));
  console.log(`wrote frontend/public/email/fonts/${to}`);
}

/* ------------------------------------------------------------ emails */

const IF_NOT_YOU = `If it wasn’t you, reset your password straight away with Forgot password on the log-in screen, and email us at <a href="mailto:${CONTACT}" style="color:${IRIS};text-decoration:underline;">${CONTACT}</a>.`;

// Supabase's otp_expiry (supabase/config.toml, and the live project's own
// setting): a link stops working an hour after it's sent.
const EXPIRES = "The link works for an hour.";

const EMAILS = {
  confirmation: layout({
    preview: "One tap and your account is ready.",
    eyebrow: "Your account",
    title: "Confirm your email",
    body: [
      p(
        `Hi ${strong("{{ .Data.username }}")}, thanks for joining PlayRates. Confirm this address to finish setting up your account.`,
      ),
      button("{{ .ConfirmationURL }}", "Confirm email"),
      note(EXPIRES),
      plainLink("{{ .ConfirmationURL }}"),
    ].join("\n"),
    reason:
      "You’re getting this because {{ .Email }} was used to sign up. If that wasn’t you, ignore it and no account will be made.",
  }),

  recovery: layout({
    preview: "Choose a new password for your account.",
    eyebrow: "Your account",
    title: "Reset your password",
    body: [
      p(
        `We got a request to reset the password for ${strong("{{ .Email }}")}. Choose a new one with the button below.`,
      ),
      button("{{ .ConfirmationURL }}", "Reset password"),
      note(
        `${EXPIRES} If you didn’t ask for this, ignore it and your password won’t change.`,
      ),
      plainLink("{{ .ConfirmationURL }}"),
    ].join("\n"),
    reason:
      "You’re getting this because someone asked to reset the password on your PlayRates account.",
  }),

  email_change: layout({
    preview: "Confirm the new email on your account.",
    eyebrow: "Your account",
    title: "Confirm your new email",
    body: [
      p(
        `You asked to change the email on your PlayRates account from ${strong("{{ .Email }}")} to ${strong("{{ .NewEmail }}")}.`,
      ),
      button("{{ .ConfirmationURL }}", "Confirm change"),
      note(
        `${EXPIRES} If you didn’t ask for this, ignore it and nothing will change.`,
      ),
      plainLink("{{ .ConfirmationURL }}"),
    ].join("\n"),
    reason:
      "You’re getting this because someone asked to change the email on your PlayRates account.",
  }),

  password_changed_notification: layout({
    preview: "The password on your account was just changed.",
    eyebrow: "Security",
    title: "Your password was changed",
    body: [
      p(
        `The password for ${strong("{{ .Email }}")} was changed just now. If this was you, there’s nothing else to do.`,
      ),
      note(IF_NOT_YOU),
    ].join("\n"),
    reason:
      "We send this whenever your password changes, to help keep your account safe.",
  }),

  email_changed_notification: layout({
    preview: "The email on your account was just changed.",
    eyebrow: "Security",
    title: "Your email was changed",
    body: [
      p(
        `The email on your PlayRates account was changed from ${strong("{{ .OldEmail }}")} to ${strong("{{ .Email }}")}. If this was you, there’s nothing else to do.`,
      ),
      note(IF_NOT_YOU),
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
