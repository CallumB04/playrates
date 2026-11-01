import { timingSafeEqual } from "node:crypto";
import { Router, type Request } from "express";
import { AppError } from "../../lib/AppError.js";
import type { GamesProvider } from "../../providers/games/GamesProvider.js";
import type { AdminRepository } from "../admin/admin.repository.js";
import type { Alerts, JobFailure } from "../admin/alerts.js";
import type { EmailService } from "../email/email.service.js";
import type { ProgressService } from "../progress/progress.service.js";
import type { GamesRepository } from "./games.repository.js";
import { refreshTrending } from "./trending.js";

interface Deps {
  provider: GamesProvider;
  repo: GamesRepository;
  progress: Pick<ProgressService, "nudge">;
  emails: Pick<
    EmailService,
    "sendWishlistReleases" | "reconcileAudience" | "sendDigest"
  >;
  admin: Pick<AdminRepository, "pruneOldRows">;
  alerts: Pick<Alerts, "jobFailed">;
  /** Vercel sends it as a bearer token on each scheduled call. Without
   *  one set, the jobs can't be run from outside at all. */
  secret: string | undefined;
}

/** Mounted at /cron: jobs Vercel runs on a schedule (see vercel.json). */
/* Constant time, so the response's timing says nothing about how much of a
   guess was right. */
const sameSecret = (given: string | undefined, expected: string): boolean => {
  const a = Buffer.from(given ?? "");
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

/** Runs one part of a job, noting a failure and letting the rest go on. */
const partOf =
  (req: Request, failures: JobFailure[]) =>
  <T>(name: string, work: Promise<T>): Promise<T | null> =>
    work.catch((error: unknown) => {
      req.log?.error({ err: error }, `cron: ${name} failed`);
      failures.push({ part: name, error });
      return null;
    });

export const createCronRouter = ({
  provider,
  repo,
  progress,
  emails,
  admin,
  alerts,
  secret,
}: Deps): Router => {
  const router = Router();

  router.use((req, _res, next) => {
    if (
      !secret ||
      !sameSecret(req.header("authorization"), `Bearer ${secret}`)
    ) {
      throw AppError.notFound("Route");
    }
    next();
  });

  /* The daily job, and the daily email work with it: Vercel's free plan
     has two crons. Each part fails alone, so a Resend outage doesn't stop
     the trending list. */
  router.get("/trending", async (req, res) => {
    const startedAt = Date.now();
    const failures: JobFailure[] = [];
    const part = partOf(req, failures);

    const trending = await part(
      "Trending list",
      refreshTrending(provider, repo),
    );
    const day = new Date().toISOString().slice(0, 10);
    const wishlist = await part(
      "Wishlist release emails",
      emails.sendWishlistReleases(day),
    );
    // Inside the function's 60 seconds, with room to answer.
    const audience = await part(
      "News audience sync",
      emails.reconcileAudience({ limit: 150, deadline: startedAt + 50_000 }),
    );
    await alerts.jobFailed("trending", failures);
    if (failures[0]?.part === "Trending list") throw failures[0].error;
    res.json({ ...trending, wishlist, audience });
  });

  // Streaks about to go and tasks nearly done, in the inbox once a day.
  // And the daily tidy, which the free plan has no third cron for.
  router.get("/nudges", async (req, res) => {
    const failures: JobFailure[] = [];
    const part = partOf(req, failures);

    const nudged = await part("Streak and task reminders", progress.nudge());
    const digest = await part("Weekly digest", emails.sendDigest(new Date()));
    const pruned = await part("Tidying old logs", admin.pruneOldRows());
    await alerts.jobFailed("nudges", failures);
    if (!nudged) throw failures[0]!.error;
    res.json({ ...nudged, digest, pruned });
  });

  return router;
};
