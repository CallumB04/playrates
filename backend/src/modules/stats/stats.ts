import { Router } from "express";
import type { GameLogsRepository } from "../game-logs/gameLogs.repository.js";
import type { GamesRepository } from "../games/games.repository.js";
import type { ProfilesRepository } from "../profiles/profiles.repository.js";

export interface StatsCounts {
  userCount: number;
  gameCount: number;
  logCount: number;
}

/** Head-only counts, so the home page shows totals without fetching rows. */
export const createStatsRouter = (
  profiles: ProfilesRepository,
  games: GamesRepository,
  gameLogs: GameLogsRepository,
): Router => {
  const router = Router();

  router.get("/", async (_req, res) => {
    const [userCount, gameCount, logCount] = await Promise.all([
      profiles.count(),
      games.count(),
      gameLogs.count(),
    ]);

    const body: StatsCounts = { userCount, gameCount, logCount };
    res.json(body);
  });

  return router;
};
