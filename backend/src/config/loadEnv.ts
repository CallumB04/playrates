import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

/**
 * Loads backend/.env into process.env.
 *
 * Imported for its side effect, and imported first, so it runs before
 * anything calls env(). No dotenv dependency: process.loadEnvFile is built
 * into Node from 20.6.
 *
 * Missing file is not an error — in production the variables come from the
 * host's own environment, and env() reports anything that is still absent.
 */
const here = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(here, "../../.env");

if (existsSync(envPath)) {
    process.loadEnvFile(envPath);
}
