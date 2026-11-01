import type { SupabaseClient } from "@supabase/supabase-js";
import type { Redis } from "@upstash/redis";
import type { Env } from "./env.js";
import {
  nullGamesProvider,
  type GamesProvider,
} from "../providers/games/GamesProvider.js";
import {
  createIgdbProvider,
  type IgdbHooks,
  type IgdbProvider,
  type IgdbRequestOutcome,
} from "../providers/games/igdb/igdb.provider.js";
import { sharedRedis } from "./redis.js";

/** Counts each IGDB request for the admin dashboard, live traffic and
 *  scripts alike. */
export const createIgdbUsageRecorder =
  (db: SupabaseClient) =>
  async ({ failed, error }: IgdbRequestOutcome): Promise<void> => {
    const { error: rpcError } = await db.rpc("bump_igdb_usage", {
      p_failed: failed,
      p_error: error,
    });
    if (rpcError) throw rpcError;
  };

type IgdbCredentials = Pick<Env, "IGDB_CLIENT_ID" | "IGDB_CLIENT_SECRET">;

/* One turn per call, spaced across every instance: the next free moment
   moves on by the gap each time one is taken. */
const NEXT_TURN = `
local now = tonumber(ARGV[1])
local gap = tonumber(ARGV[2])
local free = tonumber(redis.call('GET', KEYS[1]) or '0')
local turn = math.max(now, free)
redis.call('SET', KEYS[1], turn + gap, 'PX', 60000)
return turn - now
`;

/** The rate limit's turns and the Twitch token, kept in Redis so every
 *  instance shares them. Nothing without Redis. */
export const sharedIgdbState = (
  redis: Redis | null,
): Pick<IgdbHooks, "nextTurn" | "tokenStore"> =>
  redis
    ? {
        nextTurn: (gap) =>
          redis.eval<[number, number], number>(
            NEXT_TURN,
            ["igdb:next-turn"],
            [Date.now(), gap],
          ),
        tokenStore: {
          get: () => redis.get<string>("igdb:token"),
          set: async (value, ttlMs) => {
            await redis.set("igdb:token", value, { px: Math.max(1000, ttlMs) });
          },
        },
      }
    : {};

/** IGDB itself, or null without both Twitch credentials. */
export const igdbProviderFromEnv = (
  config: IgdbCredentials,
  db: SupabaseClient,
): IgdbProvider | null =>
  config.IGDB_CLIENT_ID && config.IGDB_CLIENT_SECRET
    ? createIgdbProvider(
        config.IGDB_CLIENT_ID,
        config.IGDB_CLIENT_SECRET,
        fetch,
        {
          onRequest: createIgdbUsageRecorder(db),
          ...sharedIgdbState(sharedRedis()),
        },
      )
    : null;

/** IGDB when both Twitch credentials are set; the local catalogue alone
 *  otherwise. */
export const igdbFromEnv = (
  config: IgdbCredentials,
  db: SupabaseClient,
): GamesProvider => igdbProviderFromEnv(config, db) ?? nullGamesProvider;
