import {
  nearlyDone,
  periodsFor,
  questCount,
  questsFor,
  TASK_TOKENS,
  type Period,
  type QuestDef,
  type SourceCounts,
} from "@playrates/shared";
import type { NotificationDraft } from "../notifications/notifications.repository.js";
import { localDay, shiftWeek, streakOf } from "./progress.logic.js";
import type { NudgeCandidate } from "./progress.repository.js";

/** From Friday a week left empty is worth a word. Monday is 0. */
export const STREAK_NUDGE_FROM = 4;
/** A task is nudged once its period has this long left. */
export const TASK_NUDGE_WITHIN_MS = 2 * 24 * 60 * 60 * 1000;
/** Only members seen this recently are nudged at all. */
export const NUDGE_ACTIVE_DAYS = 60;

export const streakNudgeKey = (week: Period): string =>
  `streak_at_risk:${week.key}`;
export const taskNudgeKey = (period: Period): string =>
  `task_nearly_done:${period.key}`;

/** Monday 0 to Sunday 6, of a calendar date. */
const weekdayOf = (day: string): number =>
  (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7;

/**
 * What to tell one member today, if anything: a streak about to be lost,
 * and a task nearly done as its week or month runs out. Each is keyed to
 * its period, so raising it once is enough however often this runs.
 */
export const nudgesFor = (
  member: NudgeCandidate,
  now: Date,
): NotificationDraft[] => {
  const zone = member.timezone;
  const periods = periodsFor(now, zone);
  const drafts: NotificationDraft[] = [];

  const current = localDay(periods.week.start, zone);
  const streak = streakOf({
    weeks: member.weeks,
    used: member.shields,
    current,
    spare: member.spare,
  });
  if (
    streak.weeks >= 1 &&
    !streak.thisWeek &&
    weekdayOf(localDay(now.toISOString(), zone)) >= STREAK_NUDGE_FROM
  ) {
    // Next week's streak, if this one stays empty: a shield that would
    // cover the gap keeps it whole.
    const after = streakOf({
      weeks: member.weeks,
      used: member.shields,
      current: shiftWeek(current, 1),
      spare: member.spare,
    });
    drafts.push({
      userId: member.userId,
      kind: "streak_at_risk",
      data: {
        weeks: streak.weeks,
        shield: after.weeks >= streak.weeks,
        endsAt: periods.week.end,
      },
      dedupeKey: streakNudgeKey(periods.week),
    });
  }

  for (const [period, counts, habits, swaps] of [
    [
      periods.week,
      member.weekCounts,
      member.weekHabits,
      member.swaps.filter((s) => s.period === periods.week.key),
    ],
    [periods.month, member.monthCounts, member.monthHabits, []],
  ] as const) {
    if (Date.parse(period.end) - now.getTime() > TASK_NUDGE_WITHIN_MS) continue;
    const closest = closestTask(
      questsFor(member.userId, period, { habits, swaps: [...swaps] }),
      counts,
    );
    if (!closest) continue;
    drafts.push({
      userId: member.userId,
      kind: "task_nearly_done",
      data: {
        period: period.kind,
        quest: closest.quest.key,
        label: closest.quest.label,
        count: closest.count,
        target: closest.quest.target,
        xp: closest.quest.xp,
        tokens: TASK_TOKENS[period.kind],
        endsAt: period.end,
      },
      dedupeKey: taskNudgeKey(period),
    });
  }

  return drafts;
};

/** The nearly done task furthest along, if there is one. */
const closestTask = (
  quests: QuestDef[],
  counts: SourceCounts,
): { quest: QuestDef; count: number } | null => {
  let best: { quest: QuestDef; count: number } | null = null;
  for (const quest of quests) {
    const count = questCount(quest, counts);
    const state = { count, target: quest.target, done: count >= quest.target };
    if (!nearlyDone(state)) continue;
    if (!best || count / quest.target > best.count / best.quest.target)
      best = { quest, count };
  }
  return best;
};
