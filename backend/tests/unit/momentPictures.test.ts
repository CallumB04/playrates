import { describe, expect, it } from "vitest";
import { BADGES } from "@playrates/shared";
import { BADGE_ICONS } from "../../src/modules/progress/badgeIcons.js";
import { bestEnding } from "../../src/modules/progress/progress.repository.js";

describe("bestEnding", () => {
  const log = (played_status: string | null, updated_at: string) => ({
    played_status,
    updated_at,
  });

  it("shows off a mastered log over a newer finished one", () => {
    const mastered = log("mastered", "2026-01-01");
    expect(bestEnding([log("finished", "2026-06-01"), mastered])).toBe(
      mastered,
    );
  });

  it("takes the latest of logs that ended alike", () => {
    const newer = log("shelved", "2026-06-01");
    expect(bestEnding([log(null, "2026-01-01"), newer])).toBe(newer);
  });

  it("has nothing to show for no logs", () => {
    expect(bestEnding([])).toBeNull();
  });
});

describe("badge icons on a share picture", () => {
  it("has every badge's icon, so none draws as a blank medal", () => {
    expect(BADGES.filter((b) => !BADGE_ICONS[b.icon])).toEqual([]);
  });
});
