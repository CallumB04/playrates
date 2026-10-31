import { Redis } from "@upstash/redis";
import { env } from "./env.js";

let client: Redis | null | undefined;

/** The shared Redis, or null when none is configured. One client per
 *  instance: it talks HTTP, so there is no connection to hold open. */
export const sharedRedis = (): Redis | null => {
  if (client !== undefined) return client;
  const e = env();
  const url = e.UPSTASH_REDIS_REST_URL ?? e.KV_REST_API_URL;
  const token = e.UPSTASH_REDIS_REST_TOKEN ?? e.KV_REST_API_TOKEN;
  client = url && token ? new Redis({ url, token }) : null;
  return client;
};
