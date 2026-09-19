import { z } from "zod";

/**
 * Parsed once at boot. A missing or malformed variable fails the process
 * immediately with a readable message, rather than surfacing as a confusing
 * runtime error on the first request that happens to need it.
 */
const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),

  /** Comma-separated allowlist. The old server used a wildcard CORS policy. */
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

  RAWG_API_KEY: z.string().optional(),

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
