import { z } from "zod";
import { SITE_ORIGIN } from "@playrates/shared";

/** Optional text where an empty value means unset: the local stack blanks
 *  a variable to stop backend/.env's copy from applying. */
const optionalText = z
  .string()
  .optional()
  .transform((v) => v || undefined);

/** Parsed once at boot, so a bad variable fails loudly instead of surfacing
 *  as a strange error on the first request. */
const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),

  /** Comma-separated list of origins allowed to call this API. */
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:5173")
    .transform((v) =>
      v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),

  SUPABASE_URL: z.string().url(),
  /** Bypasses row level security. Backend only — never expose this. */
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  /** A Twitch developer app's credentials; IGDB authenticates through
   *  Twitch. Without both, search uses the local catalogue only. */
  IGDB_CLIENT_ID: z.string().optional(),
  IGDB_CLIENT_SECRET: z.string().optional(),

  /** Vercel's cron secret; scheduled jobs are refused without it. */
  CRON_SECRET: z.string().optional(),

  /** Sends email through Resend. Contacts and broadcasts need a key with
   *  full access, not a sending-only one. */
  RESEND_API_KEY: optionalText,
  /** The Resend segment members with news emails on are kept in, and
   *  broadcasts go to. Without it news emails are not sent. */
  RESEND_SEGMENT_ID: optionalText,
  /** Signs Resend's webhooks; they are refused without it. */
  RESEND_WEBHOOK_SECRET: optionalText,
  /** Signs every unsubscribe link. Without it nothing that needs one is
   *  sent, since an email must always be possible to stop. */
  EMAIL_SIGNING_SECRET: optionalText,
  EMAIL_FROM: z.string().default("PlayRates <hello@playrates.app>"),
  /** Where links in emails point. */
  SITE_URL: z
    .string()
    .url()
    .default(SITE_ORIGIN)
    .transform((v) => v.replace(/\/+$/, "")),
  /** The API as a mail app reaches it, for one-click unsubscribe. Defaults
   *  to SITE_URL's /api/v1. */
  PUBLIC_API_URL: z
    .string()
    .url()
    .optional()
    .transform((v) => v?.replace(/\/+$/, "")),
  /** The local stack's mail viewer. Every email goes there instead. */
  MAILPIT_URL: optionalText,

  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
});

export type Env = z.infer<typeof EnvSchema>;

export const parseEnv = (source: NodeJS.ProcessEnv = process.env): Env => {
  const result = EnvSchema.safeParse(source);

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Invalid environment configuration:\n${issues}\n\n` +
        `Copy backend/.env.example to backend/.env and fill in the values.`,
    );
  }

  return result.data;
};

let cached: Env | undefined;

/** Lazily parsed so importing this module in a test does not require a full env. */
export const env = (): Env => (cached ??= parseEnv());

/** Test helper: forget the parsed env so the next call re-reads process.env. */
export const resetEnv = (): void => {
  cached = undefined;
};
