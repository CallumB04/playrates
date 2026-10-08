/**
 * The app against a local database, reset to the same made-up world on every
 * start. Nothing here can reach live: the backend and the frontend are handed
 * the local stack's address and keys, which win over backend/.env.
 *
 *   npm run dev:local        reset, then run the app on :5173 and :3000
 *                            (PORT moves the app, for when 5173 is taken)
 *   npm run db:reset:local   reset only, with the app left running
 *
 * Needs Docker. See docs/local-development.md.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appPort = process.env.PORT || "5173";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const resetOnly = process.argv.includes("--reset-only");

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    ...options,
  });
  if (result.status !== 0) {
    console.error(`\n✗ ${command} ${args.join(" ")} failed`);
    process.exit(result.status ?? 1);
  }
  return result;
};
const step = (text) => console.log(`\n▸ ${text}`);
const supabase = (...args) => run("npx", ["--no-install", "supabase", ...args]);

if (spawnSync("docker", ["info"], { stdio: "ignore" }).status !== 0) {
  console.error("Docker isn't running. Start it, then try again.");
  process.exit(1);
}

/* The one time this reads live, and only reads: the catalogue is taken once
   and kept, so a reset never needs the network. */
if (!existsSync(resolve(root, "supabase/seed/catalogue.json"))) {
  step("Copying the game catalogue from live (read-only, once)");
  run("npm", ["run", "local:snapshot"]);
}

step("Writing the seed");
run("npm", ["run", "local:seed"]);

const status = spawnSync(
  "npx",
  ["--no-install", "supabase", "status", "-o", "json"],
  { cwd: root, encoding: "utf8" },
);
if (status.status !== 0) {
  step("Starting the local Supabase stack (the first time pulls images)");
  supabase("start");
}

step("Resetting the local database");
supabase("db", "reset", "--local", "--yes");

if (resetOnly) {
  console.log("\n✓ Local database reset.");
  process.exit(0);
}

const keys = JSON.parse(
  spawnSync("npx", ["--no-install", "supabase", "status", "-o", "json"], {
    cwd: root,
    encoding: "utf8",
  }).stdout,
);

// Gitignored, like every .env file, and rewritten on every start.
writeFileSync(
  resolve(root, "frontend/.env.localdb"),
  [
    `VITE_API_BASE_URL=http://localhost:3000`,
    `VITE_SUPABASE_URL=${keys.API_URL}`,
    `VITE_SUPABASE_ANON_KEY=${keys.ANON_KEY}`,
    `VITE_LOCAL_DATA=true`,
    "",
  ].join("\n"),
);

console.log(`
✓ Local database ready
  App          http://localhost:${appPort}
  Studio       ${keys.STUDIO_URL ?? "http://127.0.0.1:55323"}
  Emails       ${keys.INBUCKET_URL ?? keys.MAILPIT_URL ?? "http://127.0.0.1:55324"}
  Accounts     docs/local-development.md
`);

const backendEnv = {
  ...process.env,
  // Pinned: a PORT set for the frontend (a preview runner sets one) would
  // otherwise put the API on the same port.
  PORT: "3000",
  CORS_ORIGINS: `http://localhost:${appPort}`,
  SUPABASE_URL: keys.API_URL,
  SUPABASE_SERVICE_ROLE_KEY: keys.SERVICE_ROLE_KEY,
  // Empty, not unset: an empty value still wins over backend/.env, and
  // with no IGDB keys search stays on the local catalogue.
  IGDB_CLIENT_ID: "",
  IGDB_CLIENT_SECRET: "",
  CRON_SECRET: "",
};

const children = [
  spawn("npm", ["run", "dev", "-w", "backend"], {
    cwd: root,
    stdio: "inherit",
    env: backendEnv,
  }),
  spawn(
    "npm",
    [
      "run",
      "dev",
      "-w",
      "frontend",
      "--",
      "--mode",
      "localdb",
      "--port",
      appPort,
      "--strictPort",
    ],
    {
      cwd: root,
      stdio: "inherit",
    },
  ),
];

const stop = () => {
  for (const child of children) child.kill("SIGTERM");
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
for (const child of children) child.on("exit", stop);
