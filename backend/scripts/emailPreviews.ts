/**
 * Writes every email to an HTML file, as a member would get it, for looking
 * at in a browser: the API's from the samples the template tests use, and
 * the auth emails from supabase/templates with Supabase's values filled in.
 *
 *   npm run emails:preview -w backend -- [--out <dir>] [--assets <origin>]
 *
 * --assets points the emails' own pictures and fonts somewhere other than
 * the live site, such as a local server for frontend/public before they're
 * deployed. Writes index.json beside them: name, subject and preview text.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SITE_ORIGIN } from "@playrates/shared";
import { emailSamples } from "../tests/helpers/emailSamples.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const arg = (name: string) => {
  const at = process.argv.indexOf(`--${name}`);
  return at === -1 ? undefined : process.argv[at + 1];
};
const out = resolve(arg("out") ?? resolve(root, ".email-previews"));
const assets = arg("assets");
mkdirSync(out, { recursive: true });

/** The inbox line: the hidden text the layout opens with. */
const previewOf = (html: string) =>
  /<div style="display:none;[^"]*">([^<]*?)(?:&#847;|&#8199;)/
    .exec(html)?.[1]
    ?.trim() ?? "";

const AUTH: Record<string, { name: string; subject: string; trigger: string }> =
  {
    confirmation: {
      name: "Confirm your email",
      subject: "Confirm your email for PlayRates",
      trigger: "You sign up with an email and password",
    },
    recovery: {
      name: "Reset your password",
      subject: "Reset your PlayRates password",
      trigger: "You ask to reset your password",
    },
    email_change: {
      name: "Confirm a new email",
      subject: "Confirm your new email for PlayRates",
      trigger: "You change the email on your account",
    },
    password_changed_notification: {
      name: "Password changed",
      subject: "Your PlayRates password was changed",
      trigger: "Your password changes",
    },
    email_changed_notification: {
      name: "Email changed",
      subject: "Your PlayRates email was changed",
      trigger: "Your email changes (sent to the old address)",
    },
  };

// What Supabase puts in a template's {{ .Values }}.
const FILLED: Record<string, string> = {
  ".ConfirmationURL": `${SITE_ORIGIN}/auth/v1/verify?token=8f2c41d07a&type=signup&redirect_to=${SITE_ORIGIN}`,
  ".Data.username": "tester",
  ".Email": "sam@example.com",
  ".NewEmail": "sam.new@example.com",
  ".OldEmail": "sam.old@example.com",
};

const withAssets = (html: string) =>
  assets ? html.replaceAll(`${SITE_ORIGIN}/email/`, `${assets}/email/`) : html;

const index: {
  key: string;
  name: string;
  trigger: string;
  subject: string;
  preview: string;
}[] = [];

for (const sample of emailSamples({
  site: SITE_ORIGIN,
  assets,
  unsubscribe: `${SITE_ORIGIN}/unsubscribe?t=sample`,
  settings: `${SITE_ORIGIN}/settings?section=emails`,
})) {
  const html = withAssets(sample.email.html);
  writeFileSync(resolve(out, `${sample.key}.html`), html);
  index.push({
    key: sample.key,
    name: sample.name,
    trigger: sample.trigger,
    subject: sample.email.subject,
    preview: previewOf(html),
  });
}

const templates = resolve(root, "supabase/templates");
for (const file of readdirSync(templates).filter((f) => f.endsWith(".html"))) {
  const key = file.replace(/\.html$/, "");
  const about = AUTH[key];
  if (!about) continue;
  const html = withAssets(
    readFileSync(resolve(templates, file), "utf8").replace(
      /\{\{\s*([.\w]+)\s*\}\}/g,
      (whole, name: string) => FILLED[name] ?? whole,
    ),
  );
  writeFileSync(resolve(out, `auth-${key}.html`), html);
  index.push({ key: `auth-${key}`, ...about, preview: previewOf(html) });
}

writeFileSync(resolve(out, "index.json"), JSON.stringify(index, null, 2));
console.log(`wrote ${index.length} emails to ${out}`);
