import { describe, expect, it } from "vitest";
import {
  BADGES,
  badgeDef,
  badgeTokens,
  badgeXp,
  levelFor,
  nearlyDone,
  periodsFor,
  QUESTS,
  questCount,
  questsFor,
  streakXp,
  swapQuest,
  xpForLevel,
  type BadgeDef,
  type QuestDef,
} from "@playrates/shared";
import {
  frameUnlocked,
  shiftWeek,
  streakOf,
  themeUnlocked,
} from "../../src/modules/progress/progress.logic.js";

describe("levelFor", () => {
  it("starts at 1 and climbs by the curve", () => {
    expect(levelFor(0)).toMatchObject({ level: 1, floor: 0, next: 100 });
    expect(levelFor(99).level).toBe(1);
    expect(levelFor(100).level).toBe(2);
    expect(levelFor(xpForLevel(10)).level).toBe(10);
    expect(levelFor(xpForLevel(10) - 1).level).toBe(9);
    expect(xpForLevel(10)).toBe(2700);
  });

  it("stops at 100", () => {
    expect(levelFor(10_000_000)).toMatchObject({
      level: 100,
      next: null,
      progress: 1,
    });
  });

  it("says how far through a level", () => {
    expect(levelFor(150).progress).toBeCloseTo(50 / 150);
  });
});

describe("the badges", () => {
  it("have unique keys and thresholds that rise metal by metal", () => {
    const all = BADGES as readonly BadgeDef[];
    expect(new Set(all.map((b) => b.key)).size).toBe(all.length);
    for (const b of all) {
      const at = b.tiers.map((t) => t.at);
      expect([...at].sort((x, y) => x - y)).toEqual(at);
      const metals = b.tiers.map((t) => t.metal);
      expect([...metals].sort()).toEqual(metals);
    }
  });
});

describe("questsFor", () => {
  const { week, month } = periodsFor(new Date("2026-10-29T12:00:00Z"), "UTC");

  it("gives 3 a week and 3 a month, each from its own pool, all different", () => {
    const w = questsFor("user-1", week);
    expect(w).toHaveLength(3);
    expect(new Set(w.map((q) => q.key)).size).toBe(3);
    expect(w.every((q) => q.period === "week")).toBe(true);
    const m = questsFor("user-1", month);
    expect(new Set(m.map((q) => q.key)).size).toBe(3);
    expect(m.every((q) => q.period === "month")).toBe(true);
  });

  it("is the same all period, and differs between people", () => {
    expect(questsFor("user-1", week)).toEqual(questsFor("user-1", week));
    const others = ["a", "b", "c", "d", "e"].map((u) =>
      questsFor(u, week)
        .map((q) => q.key)
        .join(),
    );
    expect(new Set(others).size).toBeGreaterThan(1);
  });
});

describe("questsFor, by habit", () => {
  const { week } = periodsFor(new Date("2026-10-29T12:00:00Z"), "UTC");
  const users = Array.from({ length: 40 }, (_, i) => `member-${i}`);

  it("leans towards what a member has been doing", () => {
    const share = (habits: Record<string, number>) =>
      users.filter((u) =>
        questsFor(u, week, { habits }).some((q) => q.key === "w_rate3"),
      ).length / users.length;
    expect(share({ rate: 30 })).toBeGreaterThan(share({}));
    expect(share({ rate: 30 })).toBeGreaterThan(0.7);
  });

  it("keeps one task outside their habits while there is one", () => {
    const habits = { rate: 5, play: 5, finish: 2, review_short: 1 };
    for (const u of users) {
      const dealt = questsFor(u, week, { habits });
      expect(dealt.filter((q) => questCount(q, habits) === 0)).toHaveLength(
        1,
      );
    }
  });

  it("holds still for the same habits, and gives 3 different tasks", () => {
    const habits = { rate: 4, play: 2 };
    const dealt = questsFor("member-1", week, { habits });
    expect(questsFor("member-1", week, { habits })).toEqual(dealt);
    expect(new Set(dealt.map((q) => q.key)).size).toBe(3);
  });

  it("puts a swap in its slot", () => {
    const dealt = questsFor("member-1", week);
    const next = swapQuest("member-1", week, dealt, 1)!;
    const swapped = questsFor("member-1", week, {
      swaps: [{ slot: 1, quest: next.key }],
    });
    expect(swapped[1]!.key).toBe(next.key);
    expect([swapped[0], swapped[2]]).toEqual([dealt[0], dealt[2]]);
  });
});

describe("swapQuest", () => {
  const { week } = periodsFor(new Date("2026-10-29T12:00:00Z"), "UTC");

  it("never deals a task already in the set", () => {
    for (const u of ["a", "b", "c", "d", "e", "f"]) {
      const dealt = questsFor(u, week);
      for (const slot of [0, 1, 2]) {
        const next = swapQuest(u, week, dealt, slot)!;
        expect(dealt.map((q) => q.key)).not.toContain(next.key);
      }
    }
  });

  it("passes over a task that would be done as it arrives", () => {
    const dealt = questsFor("a", week);
    const fresh = (QUESTS as readonly QuestDef[]).filter(
      (q) => q.period === "week" && !dealt.includes(q),
    );
    // Every fresh task but one is done already this week.
    const open = fresh[0]!;
    const counts = Object.fromEntries(
      fresh.slice(1).flatMap((q) => q.sources.map((s) => [s, 99])),
    );
    for (const s of open.sources) delete counts[s];
    expect(swapQuest("a", week, dealt, 0, { counts })?.key).toBe(open.key);
  });

  it("is the same swap for the same slot all week", () => {
    const dealt = questsFor("a", week);
    expect(swapQuest("a", week, dealt, 2)).toEqual(
      swapQuest("a", week, dealt, 2),
    );
  });
});

describe("nearlyDone", () => {
  it("is one step off, or three quarters there, but never untouched", () => {
    expect(nearlyDone({ count: 2, target: 3, done: false })).toBe(true);
    expect(nearlyDone({ count: 1, target: 2, done: false })).toBe(true);
    expect(nearlyDone({ count: 8, target: 10, done: false })).toBe(true);
    expect(nearlyDone({ count: 7, target: 10, done: false })).toBe(false);
    expect(nearlyDone({ count: 0, target: 1, done: false })).toBe(false);
    expect(nearlyDone({ count: 3, target: 3, done: true })).toBe(false);
  });
});

describe("rewards", () => {
  it("pays nothing for a cosmetic badge", () => {
    const founding = badgeDef("founding_member")!;
    expect(badgeXp(founding, 4)).toBe(0);
    expect(badgeTokens(founding, 4)).toBe(0);
    expect(badgeXp(badgeDef("collector")!, 4)).toBe(200);
  });

  it("grows a streak week's XP up to its ceiling", () => {
    expect(streakXp(1)).toBe(22);
    expect(streakXp(10)).toBe(40);
    expect(streakXp(40)).toBe(50);
  });
});

describe("periodsFor", () => {
  it("starts the week on Monday in the member's zone", () => {
    // Sunday evening in New York is already Monday in UTC.
    const { week } = periodsFor(
      new Date("2026-11-02T03:00:00Z"),
      "America/New_York",
    );
    expect(week.start).toBe("2026-10-26T04:00:00.000Z");
    expect(week.key).toBe("w2026-44");
  });

  it("starts the month at local midnight", () => {
    const { month } = periodsFor(
      new Date("2026-10-15T00:00:00Z"),
      "Europe/London",
    );
    expect(month).toMatchObject({
      key: "m2026-10",
      start: "2026-09-30T23:00:00.000Z",
      end: "2026-11-01T00:00:00.000Z",
    });
  });
});

describe("streakOf", () => {
  const current = "2026-10-26";
  const back = (n: number) => shiftWeek(current, -n);

  it("counts weeks in a row, this one once it has something", () => {
    expect(
      streakOf({
        weeks: [current, back(1), back(2)],
        used: [],
        current,
        spare: 0,
      }),
    ).toMatchObject({ weeks: 3, thisWeek: true });
    expect(
      streakOf({ weeks: [back(1), back(2)], used: [], current, spare: 0 }),
    ).toMatchObject({ weeks: 2, thisWeek: false });
  });

  it("bridges one missed week a month with the free shield", () => {
    const result = streakOf({
      weeks: [current, back(2), back(3)],
      used: [],
      current,
      spare: 0,
    });
    expect(result.weeks).toBe(3);
  });

  it("ends at a second miss in the same month without a bought shield", () => {
    // 5 and 12 Oct are both missed, the same month.
    const result = streakOf({
      weeks: ["2026-10-26", "2026-10-19", "2026-09-28"],
      used: [],
      current,
      spare: 0,
    });
    expect(result.weeks).toBe(2);
  });

  it("spends a bought shield on last week only, when it would end there", () => {
    // 26 Oct and 12 Oct both missed, one free shield for October: the
    // bought one takes last week, the free one the week before.
    const result = streakOf({
      weeks: ["2026-10-19", "2026-10-05"],
      used: [],
      current: "2026-11-02",
      spare: 1,
    });
    expect(result).toMatchObject({ weeks: 2, spend: "2026-10-26" });
    expect(
      streakOf({
        weeks: ["2026-10-19", "2026-10-05"],
        used: [],
        current: "2026-11-02",
        spare: 0,
      }).weeks,
    ).toBe(1);
  });

  it("names the missed weeks its shields are covering, not one it broke at", () => {
    const result = streakOf({
      weeks: [current, back(2), back(3)],
      used: [],
      current,
      spare: 0,
    });
    expect(result.shielded).toEqual([back(1)]);
    // Only a trail-off beyond the last active week: nothing to cover.
    expect(
      streakOf({ weeks: [current], used: [], current, spare: 0 }).shielded,
    ).toEqual([]);
  });

  it("keeps the longest run as the best", () => {
    const result = streakOf({
      weeks: [current, back(10), back(11), back(12), back(13)],
      used: [],
      current,
      spare: 0,
    });
    expect(result).toMatchObject({ weeks: 1, best: 4 });
  });
});

describe("unlocks", () => {
  const owned = {
    level: 22,
    items: { frame_neon: 1 },
    gold: new Set(["streaker"]),
  };

  it("opens level frames by level and bought ones by owning them", () => {
    expect(frameUnlocked("gold", owned)).toBe(true);
    expect(frameUnlocked("emerald", owned)).toBe(false);
    expect(frameUnlocked("neon", owned)).toBe(true);
    expect(frameUnlocked("flame", owned)).toBe(false);
  });

  it("opens a theme by level, purchase, or its badge at gold", () => {
    expect(themeUnlocked("gold", owned)).toBe(true);
    expect(themeUnlocked("holo", owned)).toBe(false);
    expect(themeUnlocked("night", owned)).toBe(true);
    expect(themeUnlocked("retro", owned)).toBe(false);
  });
});
