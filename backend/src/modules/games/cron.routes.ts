import { Router } from "express";
import { AppError } from "../../lib/AppError.js";
import type { GamesProvider } from "../../providers/games/GamesProvider.js";
import type { ProgressService } from "../progress/progress.service.js";
import type { EmailService } from "../email/email.service.js";
import type { GamesRepository } from "./games.repository.js";
import { refreshTrending } from "./trending.js";

interface Deps {
  provider: GamesProvider;
  repo: GamesRepository;
  progress: Pick<ProgressService, "nudge">;
  emails: Pick<EmailService, "sendWishlistReleases" | "reconcileAudience">;
  /** Vercel sends it as a bearer token on each scheduled call. Without
   *  one set, the jobs can't be run from outside at all. */
  secret: string | undefined;
}

/** Mounted at /cron: jobs Vercel runs on a schedule (see vercel.json). */
export const createCronRouter = ({
  provider,
  repo,
  progress,
  emails,
  secret,
}: Deps): Router => {
  const router = Router();

  router.use((req, _res, next) => {
    if (!secret || req.header("authorization") !== `Bearer ${secret}`) {
      throw AppError.notFound("Route");
    }
    next();
  });

  /* The daily job, and the daily email work with it: Vercel's free plan
     has two crons. Each part fails alone, so a Resend outage doesn't stop
     the trending list. */
  router.get("/trending", async (req, res) => {
    const startedAt = Date.now();
    let failed: unknown = null;
    const trending = await refreshTrending(provider, repo).catch((error) => {
      failed = error;
      return null;
    });
    const day = new Date().toISOString().slice(0, 10);
    const wishlist = await emails.sendWishlistReleases(day).catch((error) => {
      req.log?.error({ err: error }, "cron: wishlist release emails failed");
      return null;
    });
    // Inside the function's 60 seconds, with room to answer.
    const audience = await emails
      .reconcileAudience({ limit: 150, deadline: startedAt + 50_000 })
      .catch((error) => {
        req.log?.error({ err: error }, "cron: audience reconcile failed");
        return null;
      });
    if (failed) throw failed;
    res.json({ ...trending, wishlist, audience });
  });

  // Streaks about to go and tasks nearly done, in the inbox once a day.
  router.get("/nudges", async (_req, res) => {
    res.json(await progress.nudge());
  });

  return router;
};
