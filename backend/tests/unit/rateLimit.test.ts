import express from "express";
import rateLimit from "express-rate-limit";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { RedisStore, type CounterBackend } from "../../src/lib/rateLimit.js";

/** Redis as the store's script uses it: a counter that expires. */
const fakeRedis = () => {
  const counts = new Map<string, { hits: number; expiresAt: number }>();
  const live = (key: string) => {
    const entry = counts.get(key);
    if (entry && entry.expiresAt <= Date.now()) counts.delete(key);
    return counts.get(key);
  };
  const backend: CounterBackend = {
    async eval<TArgs extends unknown[], TData>(
      _script: string,
      keys: string[],
      args: TArgs,
    ) {
      const key = keys[0]!;
      const entry = live(key) ?? {
        hits: 0,
        expiresAt: Date.now() + Number(args[0]),
      };
      entry.hits += 1;
      counts.set(key, entry);
      return [entry.hits, entry.expiresAt - Date.now()] as TData;
    },
    async decr(key) {
      const entry = live(key);
      if (entry) entry.hits -= 1;
      return entry?.hits ?? 0;
    },
    async del(...keys) {
      keys.forEach((k) => counts.delete(k));
      return keys.length;
    },
  };
  return { backend, counts };
};

/** One instance of the function: its own app, its own limiter. */
const instance = (redis: CounterBackend, limit: number) => {
  const app = express();
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit,
      store: new RedisStore(redis, "rl:test:"),
    }),
  );
  app.get("/", (_req, res) => res.send("ok"));
  return app;
};

describe("RedisStore", () => {
  it("shares one count between instances", async () => {
    const { backend } = fakeRedis();
    const first = instance(backend, 3);
    const second = instance(backend, 3);

    expect((await request(first).get("/")).status).toBe(200);
    expect((await request(second).get("/")).status).toBe(200);
    expect((await request(first).get("/")).status).toBe(200);
    // The fourth, wherever it lands, is over the shared ceiling.
    expect((await request(second).get("/")).status).toBe(429);
  });

  it("keeps each limiter's count under its own prefix", async () => {
    const { backend, counts } = fakeRedis();
    const store = new RedisStore(backend, "rl:search:");
    store.init({ windowMs: 60_000 } as never);

    const info = await store.increment("1.2.3.4");

    expect(info.totalHits).toBe(1);
    expect(info.resetTime!.getTime()).toBeGreaterThan(Date.now());
    expect([...counts.keys()]).toEqual(["rl:search:1.2.3.4"]);
  });
});
