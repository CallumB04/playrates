import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

/**
 * Loads backend/.env into process.env. Imported for the side effect and
 * imported first, so it runs before anything calls env(). No dotenv needed —
 * process.loadEnvFile is built into Node 20.6+.
 *
 * A missing file is fine: in production the host supplies the variables, and
 * env() reports whatever is still absent.
 */
const here = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(here, "../../.env");

if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}
