import { describe, expect, it } from "vitest";
import request from "supertest";
import { backfillProgress } from "../../src/modules/progress/progress.backfill.js";
import { createProgressService } from "../../src/modules/progress/progress.service.js";
import {
  authHeader,
  buildTestApp,
  USER_A,
  USER_B,
} from "../helpers/buildTestApp.js";
import { baseSeed, buildProfile } from "../helpers/fixtures.js";

const setup = () => {
  const built = buildTestApp({
    seed: {
      ...baseSeed(),
      profiles: [
        // From before progress, and not back since.
        buildProfile({ revealed_at: null }),
        buildProfile({ id: USER_B, username: "frienduser" }),
      ],
    },
  });
  const { repos, state } = built;
  state.progressMetrics.set(USER_A, { logged: 60, finished: 30 });
  state.progressMetrics.set(USER_B, { logged: 12 });
  const service = createProgressService(
    repos.progress,
    repos.profiles,
    repos.friends,
    repos.lists,
    repos.notifications,
    { backdrops: async () => [], hasLogged: async () => false },
    async () => null,
  );
  const source = {
    ids: (after: string | null, limit: number) =>
      repos.progress.profileIds(after, limit),
    evaluate: (id: string) => service.evaluate(id),
  };
  return { ...built, source };
};

describe("backfillProgress", () => {
  it("brings every member up to date, a batch at a time", async () => {
    const { source, state } = setup();
    const result = await backfillProgress(source, { batch: 1 });
    expect(result).toEqual({ evaluated: 2, failed: [] });
    expect(state.profiles.every((p) => p.xp > 0)).toBe(true);
  });

  it("leaves a member's reveal, badges and all, for their next visit", async () => {
    const { source, state, app } = setup();
    await backfillProgress(source);

    expect(state.profiles.find((p) => p.id === USER_A)!.revealed_at).toBeNull();
    const first = (
      await request(app)
        .get("/api/v1/me/progress")
        .set("Authorization", authHeader(USER_A))
    ).body;
    expect(first.reveal).toBe(true);
    expect(first.unseen.badges.map((b: { badge: string }) => b.badge)).toEqual(
      expect.arrayContaining(["collector", "finisher"]),
    );
    expect(first.unseen.xp).toEqual([]);
    expect(first.tokens).toBeGreaterThan(0);
  });

  it("pays nothing more the second time", async () => {
    const { source, state } = setup();
    await backfillProgress(source);
    const ledgers = () => [
      state.xpEvents.length,
      state.tokenEvents.length,
      state.userBadges.length,
    ];
    const once = ledgers();
    await backfillProgress(source);
    expect(ledgers()).toEqual(once);
  });

  it("carries on past a member it can't evaluate", async () => {
    const { source } = setup();
    const failing = {
      ...source,
      evaluate: async (id: string) => {
        if (id === USER_A) throw new Error("bad row");
        return source.evaluate(id);
      },
    };
    expect(await backfillProgress(failing)).toEqual({
      evaluated: 1,
      failed: [USER_A],
    });
  });
});
