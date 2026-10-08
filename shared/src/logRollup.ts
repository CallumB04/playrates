import type { GameLog, GameStatus, PlayedStatus } from "./schemas/gameLog.js";

/**
 * Which of a person's logs of one game speaks for it: the status on the
 * cover, and the bucket they count in on the game page. Playing beats
 * everything because it is what they are doing now; a played run beats a
 * backlog entry on another console. Mirrors log_rank() in SQL.
 */
export const logRank = (
  status: GameStatus,
  playedStatus: PlayedStatus | null,
): number => {
  if (status === "playing") return 1;
  if (status === "played") {
    switch (playedStatus) {
      case "mastered":
        return 2;
      case "finished":
        return 3;
      case "retired":
        return 4;
      case "shelved":
        return 5;
      default:
        return 6;
    }
  }
  return status === "backlog" ? 7 : 8;
};

type Ranked = {
  id: number;
  status: GameStatus;
  playedStatus: PlayedStatus | null;
};

/** The log that speaks for the game. Ties go to the oldest, as in SQL. */
export const headlineOf = <T extends Ranked>(logs: readonly T[]): T | null =>
  logs.reduce<T | null>((best, log) => {
    if (!best) return log;
    const a = logRank(log.status, log.playedStatus);
    const b = logRank(best.status, best.playedStatus);
    return a < b || (a === b && log.id < best.id) ? log : best;
  }, null);

/** The mean, rounded to two places as games.avg_rating is. */
export const meanRating = (
  ratings: readonly (number | null)[],
): number | null => {
  const rated = ratings.filter((r): r is number => r !== null);
  if (rated.length === 0) return null;
  const sum = rated.reduce((a, b) => a + b, 0);
  return Math.round((sum / rated.length) * 100) / 100;
};

/** A person's logs of one game, added up. */
export interface GameLogRollup {
  logCount: number;
  /** The consoles logged, in log order. A log without one adds nothing. */
  systems: string[];
  status: GameStatus;
  playedStatus: PlayedStatus | null;
  /** The mean of the rated logs. */
  rating: number | null;
  ratedCount: number;
  /** Summed across consoles; null when no log has hours. */
  hoursPlayed: number | null;
  /** The fastest time to beat, and the log it was on. */
  quickestBeat: { hours: number; logId: number; system: string | null } | null;
  /** The best achievement completion, 0 to 1. Lists differ by console, so
   *  the best one is the fair figure, not an average. */
  completion: number | null;
  lastPlayed: string | null;
  updatedAt: string;
  /** When the first of its logs was made. A second console logged later
   *  does not make the game newly added. */
  addedAt: string;
}

const completionOf = (log: GameLog): number | null =>
  log.achievementsTotal && log.achievementsTotal > 0
    ? Math.min((log.achievementsCompleted ?? 0) / log.achievementsTotal, 1)
    : null;

const latest = (dates: (string | null)[]): string | null =>
  dates.reduce<string | null>(
    (best, d) => (d !== null && (best === null || d > best) ? d : best),
    null,
  );

export const rollupLogs = (logs: readonly GameLog[]): GameLogRollup | null => {
  const headline = headlineOf(logs);
  if (!headline) return null;

  const hours = logs
    .map((l) => l.hoursPlayed)
    .filter((h): h is number => h !== null);

  const quickest = logs.reduce<GameLog | null>(
    (best, l) =>
      l.hoursToBeat !== null &&
      (best === null || l.hoursToBeat < (best.hoursToBeat as number))
        ? l
        : best,
    null,
  );

  const completions = logs
    .map(completionOf)
    .filter((c): c is number => c !== null);

  return {
    logCount: logs.length,
    systems: logs.map((l) => l.system).filter((s): s is string => s !== null),
    status: headline.status,
    playedStatus: headline.playedStatus,
    rating: meanRating(logs.map((l) => l.rating)),
    ratedCount: logs.filter((l) => l.rating !== null).length,
    hoursPlayed:
      hours.length === 0
        ? null
        : Math.round(hours.reduce((a, b) => a + b, 0) * 10) / 10,
    quickestBeat: quickest
      ? {
          hours: quickest.hoursToBeat as number,
          logId: quickest.id,
          system: quickest.system,
        }
      : null,
    completion: completions.length === 0 ? null : Math.max(...completions),
    lastPlayed: latest(logs.map((l) => l.finishDate ?? l.startDate)),
    updatedAt: latest(logs.map((l) => l.updatedAt)) as string,
    addedAt: logs.reduce(
      (first, l) => (l.createdAt < first ? l.createdAt : first),
      logs[0]!.createdAt,
    ),
  };
};
