import type { JWTPayload } from "jose";
import type { Express } from "express";
import { buildApp } from "../../src/app.js";
import { resetEnv } from "../../src/config/env.js";
import { createLogger } from "../../src/lib/logger.js";
import type { GamesProvider } from "../../src/providers/games/GamesProvider.js";
import { nullGamesProvider } from "../../src/providers/games/GamesProvider.js";
import type { Repositories } from "../../src/repositories.js";
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
  delete process.env.RAWG_API_KEY;
  resetEnv();
};

/**
 * Accepts "Bearer test:<uuid>" and authenticates as that user, so tests never
 * sign real JWTs. The real verifier is covered separately.
 */
export const fakeVerify = async (token: string): Promise<JWTPayload> => {
  if (!token.startsWith("test:")) throw new Error("invalid test token");
  return { sub: token.slice("test:".length), aud: "authenticated" };
};

export const authHeader = (userId: string) => `Bearer test:${userId}`;

interface TestAppOptions {
  seed?: SeedData;
  provider?: GamesProvider;
  repos?: Repositories;
}

export const buildTestApp = (
  options: TestAppOptions = {},
): { app: Express; repos: Repositories; state: InMemoryState } => {
  setTestEnv();

  const { repos, state, authAdmin, avatars, communityImages } =
    createInMemoryRepos(options.seed);
  const resolved = options.repos ?? repos;

  const app = buildApp({
    repos: resolved,
    provider: options.provider ?? nullGamesProvider,
    authAdmin,
    avatars,
    communityImages,
    verify: fakeVerify,
    logger: createLogger(),
  });

  return { app, repos: resolved, state };
};
