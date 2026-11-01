import rateLimit, {
  type ClientRateLimitInfo,
  type Options,
  type Store,
} from "express-rate-limit";
import { sharedRedis } from "../config/redis.js";

/** Just what the store needs of a Redis client, so a test can stand in. */
export interface CounterBackend {
  eval<TArgs extends unknown[], TData = unknown>(
    script: string,
    keys: string[],
    args: TArgs,
  ): Promise<TData>;
  decr(key: string): Promise<number>;
  del(...keys: string[]): Promise<number>;
}

/* One round trip, and atomic: the first hit in a window starts its clock. */
const INCREMENT = `
local hits = redis.call('INCR', KEYS[1])
if hits == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
return {hits, redis.call('PTTL', KEYS[1])}
`;

/**
 * Counts in Redis, so every instance of the function shares one count.
 * Counted in memory, each instance starts afresh on a cold start and the
 * real ceiling is the configured one times however many are running.
 */
export class RedisStore implements Store {
  localKeys = false;
  private windowMs = 60_000;

  constructor(
    private readonly redis: CounterBackend,
    readonly prefix: string,
  ) {}

  init(options: Options): void {
    this.windowMs = options.windowMs;
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    const [hits, ttl] = await this.redis.eval<[number], [number, number]>(
      INCREMENT,
      [this.prefix + key],
      [this.windowMs],
    );
    return {
      totalHits: hits,
      resetTime: new Date(Date.now() + (ttl > 0 ? ttl : this.windowMs)),
    };
  }

  async decrement(key: string): Promise<void> {
    await this.redis.decr(this.prefix + key);
  }

  async resetKey(key: string): Promise<void> {
    await this.redis.del(this.prefix + key);
  }
}

/** A ceiling per client per minute. Build one per app rather than per
 *  module, so each app built (every test builds its own) counts afresh.
 *  `name` keeps each limiter's count apart when they share Redis. */
export const perMinute = (name: string, limit: number) => {
  const redis = sharedRedis();
  return rateLimit({
    windowMs: 60_000,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    // A Redis outage lets requests through rather than taking the site down.
    passOnStoreError: true,
    store: redis ? new RedisStore(redis, `rl:${name}:`) : undefined,
  });
};
