import { Router } from "express";
import { AppError } from "../../lib/AppError.js";
import type { GamesProvider } from "../../providers/games/GamesProvider.js";
import type { ProgressService } from "../progress/progress.service.js";
import type { GamesRepository } from "./games.repository.js";
import { refreshTrending } from "./trending.js";

interface Deps {
  provider: GamesProvider;
  repo: GamesRepository;
  progress: Pick<ProgressService, "nudge">;
  /** Vercel sends it as a bearer token on each scheduled call. Without
   *  one set, the jobs can't be run from outside at all. */
  secret: string | undefined;
}

/** Mounted at /cron: jobs Vercel runs on a schedule (see vercel.json). */
export const createCronRouter = ({
  provider,
  repo,
  progress,
  secret,
}: Deps): Router => {
  const router = Router();

  router.use((req, _res, next) => {
    if (!secret || req.header("authorization") !== `Bearer ${secret}`) {
      throw AppError.notFound("Route");
    }
    next();
  });

  router.get("/trending", async (_req, res) => {
    res.json(await refreshTrending(provider, repo));
  });

  // Streaks about to go and tasks nearly done, in the inbox once a day.
  router.get("/nudges", async (_req, res) => {
    res.json(await progress.nudge());
  });

  return router;
};
