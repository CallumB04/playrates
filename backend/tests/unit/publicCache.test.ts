import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { publicCache } from "../../src/lib/publicCache.js";
import { createErrorHandler } from "../../src/middleware/errorHandler.js";
import { AppError } from "../../src/lib/AppError.js";
import { memoFor } from "../../src/lib/memo.js";

const app = () => {
  const a = express();
  a.use("/api/v1", publicCache);
  a.get("/api/v1/games", (_req, res) => res.json({}));
  a.get("/api/v1/genres", (_req, res) => res.json({}));
  a.get("/api/v1/users/x/stats", (_req, res) => res.json({}));
  a.get("/api/v1/games/missing", () => {
    throw AppError.notFound("Game");
  });
  a.use(createErrorHandler());
  return a;
};

describe("publicCache", () => {
  it("lets the CDN keep a public read for anyone signed out", async () => {
    const res = await request(app()).get("/api/v1/games");
    expect(res.headers["cache-control"]).toContain("s-maxage=60");
    const genres = await request(app()).get("/api/v1/genres");
    expect(genres.headers["cache-control"]).toContain("s-maxage=86400");
  });

  it("keeps nothing a signed-in request gets back", async () => {
    const res = await request(app())
      .get("/api/v1/games")
      .set("Authorization", "Bearer x");
    expect(res.headers["cache-control"]).toBeUndefined();
  });

  it("leaves profiles alone, so going private takes effect at once", async () => {
    const res = await request(app()).get("/api/v1/users/x/stats");
    expect(res.headers["cache-control"]).toBeUndefined();
  });

  it("never keeps an error", async () => {
    const res = await request(app()).get("/api/v1/games/missing");
    expect(res.status).toBe(404);
    expect(res.headers["cache-control"]).toBe("no-store");
  });
});

describe("memoFor", () => {
  it("answers from memory until it goes stale, and forgets a failure", async () => {
    let calls = 0;
    let fail = true;
    const load = memoFor(60_000, async () => {
      calls += 1;
      if (fail) throw new Error("down");
      return calls;
    });

    await expect(load()).rejects.toThrow("down");
    fail = false;
    expect(await load()).toBe(2);
    expect(await load()).toBe(2);
    expect(calls).toBe(2);
  });
});
