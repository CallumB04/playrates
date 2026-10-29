import { describe, expect, it } from "vitest";
import { questsFor, periodsFor } from "@playrates/shared";
import { nudgesFor } from "../../src/modules/progress/progress.nudges.js";
import type { NudgeCandidate } from "../../src/modules/progress/progress.repository.js";

const member = (over: Partial<NudgeCandidate> = {}): NudgeCandidate => ({
  userId: "member-1",
  timezone: "Europe/London",
  weeks: ["2026-10-19", "2026-10-12", "2026-10-05"],
  shields: [],
  spare: 0,
  weekCounts: {},
  monthCounts: {},
  weekHabits: {},
  monthHabits: {},
  swaps: [],
  ...over,
});

const FRIDAY = new Date("2026-10-30T12:00:00Z");
const THURSDAY = new Date("2026-10-29T12:00:00Z");
const SATURDAY = new Date("2026-10-31T12:00:00Z");

const kinds = (m: NudgeCandidate, now: Date) =>
  nudgesFor(m, now).map((d) => d.kind);

describe("the streak nudge", () => {
  it("comes from Friday for a streak with nothing yet this week", () => {
    expect(kinds(member(), THURSDAY)).toEqual([]);
    const [draft] = nudgesFor(member(), FRIDAY);
    expect(draft).toMatchObject({
      kind: "streak_at_risk",
      data: { weeks: 3, shield: true, endsAt: "2026-11-02T00:00:00.000Z" },
      dedupeKey: "streak_at_risk:w2026-44",
    });
  });

  it("follows the member's own week", () => {
    // Still Thursday in Los Angeles.
    expect(
      kinds(
        member({ timezone: "America/Los_Angeles" }),
        new Date("2026-10-30T05:00:00Z"),
      ),
    ).toEqual([]);
  });

  it("says nothing once the week has something in it, or without a streak", () => {
    expect(
      kinds(member({ weeks: ["2026-10-26", "2026-10-19"] }), FRIDAY),
    ).toEqual([]);
    expect(kinds(member({ weeks: [] }), FRIDAY)).toEqual([]);
  });

  it("says whether a shield would keep it", () => {
    // October's free shield went on 12 Oct, so an empty week now ends it.
    const spent = member({ weeks: ["2026-10-19", "2026-10-05", "2026-09-28"] });
    expect(nudgesFor(spent, FRIDAY)[0]?.data).toMatchObject({
      weeks: 3,
      shield: false,
    });
    // A bought one would cover it.
    expect(nudgesFor({ ...spent, spare: 1 }, FRIDAY)[0]?.data).toMatchObject({
      shield: true,
    });
  });
});

describe("the task nudge", () => {
  const busy = { weeks: ["2026-10-26", "2026-10-19"] };

  it("names the task furthest along as its period ends", () => {
    const { week } = periodsFor(SATURDAY, "Europe/London");
    const weekHabits = { rate: 50 };
    const dealt = questsFor("member-1", week, { habits: weekHabits });
    expect(dealt.map((q) => q.key)).toContain("w_rate3");

    const drafts = nudgesFor(
      member({ ...busy, weekHabits, weekCounts: { rate: 2 } }),
      SATURDAY,
    );
    expect(drafts).toEqual([
      expect.objectContaining({
        kind: "task_nearly_done",
        dedupeKey: "task_nearly_done:w2026-44",
        data: expect.objectContaining({
          period: "week",
          quest: "w_rate3",
          count: 2,
          target: 3,
          tokens: 5,
        }),
      }),
    ]);
  });

  it("waits until the period has two days left", () => {
    const { week } = periodsFor(FRIDAY, "Europe/London");
    const counts = Object.fromEntries(
      questsFor("member-1", week).flatMap((q) =>
        q.sources.map((s) => [s, q.target - 1]),
      ),
    );
    expect(
      kinds(member({ ...busy, weekCounts: counts }), FRIDAY),
    ).not.toContain("task_nearly_done");
  });

  it("leaves untouched tasks alone", () => {
    expect(kinds(member(busy), SATURDAY)).toEqual([]);
  });
});
