import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

/**
 * Loads backend/.env into process.env. Imported for the side effect, and
 * imported first so it runs before anything calls env(). A missing file is
 * fine — in production the host supplies the variables.
 *
 * `import.meta.url` is empty when a bundler emits CommonJS, which is why this
 * does not assume it: an empty one used to take the whole process down before
 * a single request was served.
 */
const candidates = [
  import.meta.url &&
    resolve(dirname(fileURLToPath(import.meta.url)), "../../.env"),
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "backend/.env"),
].filter((path): path is string => typeof path === "string");

const found = candidates.find(existsSync);
if (found) {
  process.loadEnvFile(found);
}
