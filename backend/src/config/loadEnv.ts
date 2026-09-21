import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

/**
 * Loads backend/.env into process.env. Imported for the side effect, and
 * imported first so it runs before anything calls env(). A missing file is
 * fine — in production the host supplies the variables.
 */
const here = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(here, "../../.env");

if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}
