import { describe, expect, it } from "vitest";
import {
  headlineOf,
  meanRating,
  rollupLogs,
  type GameLog,
} from "@playrates/shared";
import { pickLegacyLog } from "../../src/modules/game-logs/legacyLog.js";

const log = (overrides: Partial<GameLog> = {}): GameLog => ({
  id: 1,
  gameId: 1,
  status: "played",
  playedStatus: null,
  rating: null,
  hoursPlayed: null,
  hoursToBeat: null,
  startDate: null,
  finishDate: null,
  platform: null,
  system: null,
  achievementsTotal: null,
  achievementsCompleted: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

describe("headlineOf", () => {
  it("puts what you are playing now ahead of a finished run", () => {
    const headline = headlineOf([
      log({ id: 1, status: "played", playedStatus: "mastered" }),
      log({ id: 2, status: "playing" }),
    ]);
    expect(headline?.id).toBe(2);
  });

  it("puts a played run ahead of a backlog entry on another console", () => {
    const headline = headlineOf([
      log({ id: 1, status: "backlog" }),
      log({ id: 2, status: "played", playedStatus: null }),
    ]);
    expect(headline?.id).toBe(2);
  });

  it("ranks endings: mastered over finished over retired over shelved", () => {
    const endings = ["shelved", "retired", "finished", "mastered"] as const;
    const headline = headlineOf(
      endings.map((playedStatus, i) => log({ id: i + 1, playedStatus })),
    );
    expect(headline?.playedStatus).toBe("mastered");
  });

  it("breaks a tie on the oldest log, as the SQL does", () => {
    const headline = headlineOf([
      log({ id: 5, status: "wishlist" }),
      log({ id: 3, status: "wishlist" }),
    ]);
    expect(headline?.id).toBe(3);
  });

  it("has nothing to say about no logs", () => {
    expect(headlineOf([])).toBeNull();
  });
});

describe("meanRating", () => {
  it("leaves unrated logs out rather than counting them as zero", () => {
    expect(meanRating([9, null, 8])).toBe(8.5);
  });

  it("rounds to two places", () => {
    expect(meanRating([9, 8.5, 8.5])).toBe(8.67);
  });

  it("is null when nothing is rated", () => {
    expect(meanRating([null, null])).toBeNull();
  });
});

describe("rollupLogs", () => {
  const ps5 = log({
    id: 1,
    system: "playstation5",
    rating: 9,
    hoursPlayed: 40,
    hoursToBeat: 32,
    finishDate: "2026-03-01",
    achievementsTotal: 50,
    achievementsCompleted: 25,
  });
  const nsw = log({
    id: 2,
    system: "switch",
    status: "playing",
    rating: 7,
    hoursPlayed: 12.5,
    hoursToBeat: 21,
    startDate: "2026-05-01",
    achievementsTotal: 10,
    achievementsCompleted: 9,
    updatedAt: "2026-05-02T00:00:00.000Z",
  });

  it("adds hours up across consoles", () => {
    expect(rollupLogs([ps5, nsw])?.hoursPlayed).toBe(52.5);
  });

  it("keeps hours null when no log has any, rather than a zero", () => {
    expect(rollupLogs([log()])?.hoursPlayed).toBeNull();
  });

  it("takes the quickest time to beat, with the console it was on", () => {
    expect(rollupLogs([ps5, nsw])?.quickestBeat).toEqual({
      hours: 21,
      logId: 2,
      system: "switch",
    });
  });

  it("takes the best completion, as trophy lists differ by console", () => {
    expect(rollupLogs([ps5, nsw])?.completion).toBe(0.9);
  });

  it("averages the ratings and counts the rated logs", () => {
    const rollup = rollupLogs([ps5, nsw, log({ id: 3, system: "pc" })]);
    expect(rollup?.rating).toBe(8);
    expect(rollup?.ratedCount).toBe(2);
  });

  it("speaks with the headline status and lists the consoles", () => {
    const rollup = rollupLogs([ps5, nsw, log({ id: 3 })]);
    expect(rollup?.status).toBe("playing");
    expect(rollup?.systems).toEqual(["playstation5", "switch"]);
    expect(rollup?.logCount).toBe(3);
  });

  it("dates it by the latest play and the latest edit", () => {
    const rollup = rollupLogs([ps5, nsw]);
    expect(rollup?.lastPlayed).toBe("2026-05-01");
    expect(rollup?.updatedAt).toBe("2026-05-02T00:00:00.000Z");
  });
});

describe("pickLegacyLog", () => {
  const ps5 = { id: 1, system_slug: "playstation5" };
  const bare = { id: 2, system_slug: null };

  it("creates when there is no log, and edits the only one there is", () => {
    expect(pickLegacyLog([])).toEqual({ kind: "none" });
    expect(pickLegacyLog([ps5], "switch")).toEqual({ kind: "one", log: ps5 });
  });

  it("picks among several by the console the write names", () => {
    expect(pickLegacyLog([ps5, bare], "playstation5")).toEqual({
      kind: "one",
      log: ps5,
    });
    expect(pickLegacyLog([ps5, bare], null)).toEqual({
      kind: "one",
      log: bare,
    });
  });

  /* Guessing would overwrite another console's log. */
  it("won't guess between several", () => {
    expect(pickLegacyLog([ps5, bare])).toEqual({ kind: "several" });
    expect(pickLegacyLog([ps5, bare], "switch")).toEqual({ kind: "several" });
  });
});
