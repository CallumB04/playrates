import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const vercel = JSON.parse(
  readFileSync(new URL("../../../vercel.json", import.meta.url), "utf8"),
) as {
  crons: { path: string }[];
  rewrites: { source: string; destination: string }[];
  functions: Record<string, unknown>;
};

const cronRoutes = readFileSync(
  new URL("../../src/modules/games/cron.routes.ts", import.meta.url),
  "utf8",
);

describe("vercel.json", () => {
  it("sends each cron to the cron function, naming a job the API has", () => {
    expect(vercel.functions["api/cron.ts"]).toBeDefined();
    for (const { path } of vercel.crons) {
      const match = /^\/api\/cron\?job=([a-z-]+)$/.exec(path);
      expect(match, path).not.toBeNull();
      expect(cronRoutes).toContain(`router.get("/${match![1]}"`);
    }
  });

  it("keeps the cron function out of the rewrite every other /api path takes", () => {
    const rule = vercel.rewrites.find((r) => r.destination === "/api")!;
    // Vercel's patterns are path-to-regexp; this one is a plain regex group.
    const pattern = new RegExp(`^${rule.source}$`);
    expect(pattern.test("/api/cron")).toBe(false);
    expect(pattern.test("/api/v1/games")).toBe(true);
    expect(pattern.test("/api/v1/cron/trending")).toBe(true);
  });
});
