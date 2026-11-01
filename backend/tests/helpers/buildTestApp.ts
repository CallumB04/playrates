import type { JWTPayload } from "jose";
import type { Express } from "express";
import { buildApp } from "../../src/app.js";
import { resetEnv } from "../../src/config/env.js";
import { createLogger } from "../../src/lib/logger.js";
import type { PushPayload, PushSender } from "../../src/config/push.js";
import type { SteamClient } from "../../src/providers/steam.js";
import type { GamesProvider } from "../../src/providers/games/GamesProvider.js";
import { nullGamesProvider } from "../../src/providers/games/GamesProvider.js";
import type { Repositories } from "../../src/repositories.js";
import { createEmailFakes, type EmailRecorder } from "./inMemoryEmail.js";
import {
  createInMemoryRepos,
  type InMemoryState,
  type SeedData,
} from "./inMemoryRepos.js";

export const USER_A = "11111111-1111-1111-1111-111111111111";
export const USER_B = "22222222-2222-2222-2222-222222222222";

/** The env the app needs to boot. Never contacts Supabase in these tests. */
export const setTestEnv = (): void => {
  process.env.NODE_ENV = "test";
  process.env.SUPABASE_URL = "https://test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  process.env.LOG_LEVEL = "silent";
  process.env.CORS_ORIGINS = "http://localhost:5173";
  delete process.env.IGDB_CLIENT_ID;
  delete process.env.IGDB_CLIENT_SECRET;
  process.env.CRON_SECRET = "test-cron-secret";
  resetEnv();
};

/**
 * Accepts "Bearer test:<uuid>" and authenticates as that user, so tests never
 * sign real JWTs. The real verifier is covered separately.
 */
/* "test:<id>" signed in just now; "test-stale:<id>" an hour ago, for what
   wants a recent sign-in. */
export const fakeVerify = async (token: string): Promise<JWTPayload> => {
  const [kind, sub] = token.split(":");
  if (!sub || (kind !== "test" && kind !== "test-stale")) {
    throw new Error("invalid test token");
  }
  const at = Math.floor(Date.now() / 1000) - (kind === "test" ? 0 : 3600);
  return {
    sub,
    aud: "authenticated",
    amr: [{ method: "password", timestamp: at }],
  };
};

export const authHeader = (userId: string) => `Bearer test:${userId}`;
export const staleAuthHeader = (userId: string) =>
  `Bearer test-stale:${userId}`;

interface TestAppOptions {
  seed?: SeedData;
  provider?: GamesProvider;
  repos?: Repositories;
  production?: boolean;
  push?: PushSender;
  steam?: SteamClient;
}

/** A push service that keeps what it's sent. An endpoint with "gone" in it
 *  answers as a forgotten browser does. */
export const createPushRecorder = () => {
  const sent: { endpoint: string; payload: PushPayload }[] = [];
  const sender: PushSender = {
    publicKey: "test-public-key",
    async send(target, payload) {
      if (target.endpoint.includes("gone")) return "gone";
      sent.push({ endpoint: target.endpoint, payload });
      return "sent";
    },
  };
  return { sender, sent };
};

/** index.html as the build leaves it, cut down to what pages touch. */
export const TEST_TEMPLATE = `<!doctype html>
<html lang="en">
    <head>
        <!-- head:start -->
        <title>PlayRates / Video Game Tracker</title>
        <!-- head:end -->
    </head>
    <body><div id="root"></div></body>
</html>`;

export const buildTestApp = (
  options: TestAppOptions = {},
): {
  app: Express;
  repos: Repositories;
  state: InMemoryState;
  email: EmailRecorder;
} => {
  setTestEnv();

  const { repos, state, authAdmin, avatars, communityImages } =
    createInMemoryRepos(options.seed);
  const resolved = options.repos ?? repos;
  const email = createEmailFakes();

  const app = buildApp({
    repos: resolved,
    provider: options.provider ?? nullGamesProvider,
    authAdmin,
    avatars,
    communityImages,
    email: email.deps,
    push: options.push ?? null,
    steam: options.steam ?? null,
    verify: fakeVerify,
    logger: createLogger(),
    template: async () => TEST_TEMPLATE,
    production: options.production ?? false,
  });

  return { app, repos: resolved, state, email: email.recorder };
};
