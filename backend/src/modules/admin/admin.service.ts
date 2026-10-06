import { patchNoteAnnouncement } from "@playrates/shared";
import type {
  AdminActivityQuery,
  AdminGameEventsQuery,
  AdminHealth,
  AdminImportResult,
  AdminMetric,
  AdminPullInput,
  AdminRange,
  AdminUsersQuery,
  AnnouncementInput,
} from "@playrates/shared";
import { AppError } from "../../lib/AppError.js";
import { paginate, toRange } from "../../lib/pagination.js";
import type { GamesProvider } from "../../providers/games/GamesProvider.js";
import type { GamesRepository } from "../games/games.repository.js";
import type { GamesService } from "../games/games.service.js";
import type { NotificationsRepository } from "../notifications/notifications.repository.js";
import type { AdminRepository } from "./admin.repository.js";
import {
  isoDay,
  IGDB_USAGE_DAYS,
  rangeWindow,
  toActivityEvent,
  toAnnouncement,
  toCursorPage,
  toGameEvent,
  toGameSummary,
  toMetricDetail,
  toOverview,
  toIgdbUsage,
  toPatchNote,
  toServerError,
  toUserSummary,
} from "./admin.mapper.js";

/** When this instance started, for "up since" on the health view. */
const bootedAt = Date.now();

const DAY_MS = 86_400_000;

/** Twelve weeks: enough for a person's habits to show, few enough to draw. */
const ACTIVE_DAYS_SHOWN = 84;

/** Everything behind /admin. requireAdmin has already run by the time any of
 *  this is reached, so nothing here checks the caller again. */
export const createAdminService = (deps: {
  repo: AdminRepository;
  games: GamesRepository;
  gamesService: GamesService;
  notifications: NotificationsRepository;
  provider: GamesProvider;
  now?: () => Date;
}) => {
  const { repo, games, gamesService, notifications, provider } = deps;
  const now = deps.now ?? (() => new Date());

  const findGame = async (id: number) => {
    const row = await games.findById(id);
    if (!row) throw AppError.notFound("Game");
    return toGameSummary(row);
  };

  const igdbUsage = async () => {
    const today = now();
    const from = isoDay(new Date(today.getTime() - (IGDB_USAGE_DAYS - 1) * DAY_MS));
    return toIgdbUsage(await repo.igdbUsage(from), today);
  };

  /** Only to the admin, and kept out of the history: it is a proof. */
  const sendTestAnnouncement = async (input: AnnouncementInput, actorId: string) => {
    await notifications.raise({
      userId: actorId,
      kind: "announcement",
      data: {
        tone: input.tone,
        title: input.title,
        body: input.body,
        link: input.link,
        test: true,
      },
      dedupeKey: `announcement_test:${now().getTime()}`,
    });
  };

  return {
    async overview(range: AdminRange) {
      const window = rangeWindow(range, now());
      const [totals, rows] = await Promise.all([
        repo.totals(),
        repo.series(window.previousFrom, window.to, window.bucket),
      ]);
      return toOverview(window, totals, rows);
    },

    async metricDetail(metric: AdminMetric, range: AdminRange) {
      const window = rangeWindow(range, now());
      const to = new Date(Date.parse(`${window.to}T00:00:00Z`) + DAY_MS);
      const raw = await repo.metricDetail(
        metric,
        `${window.from}T00:00:00Z`,
        to.toISOString(),
      );
      return toMetricDetail(metric, raw);
    },

    async activity(query: AdminActivityQuery) {
      const rows = await repo.activity(query);
      return toCursorPage(rows, query.limit, toActivityEvent);
    },

    async users(query: AdminUsersQuery) {
      const pagination = { page: query.page, limit: query.limit };
      const { from, to } = toRange(pagination);
      const { rows, total } = await repo.users(query, from, to);
      const at = now().getTime();
      return paginate(
        rows.map((row) => toUserSummary(row, at)),
        pagination,
        total,
      );
    },

    async user(id: string) {
      const row = await repo.userById(id);
      if (!row) throw AppError.notFound("User");
      const from = isoDay(new Date(now().getTime() - (ACTIVE_DAYS_SHOWN - 1) * DAY_MS));
      return {
        ...toUserSummary(row, now().getTime()),
        activeDays: await repo.userActiveDays(id, from),
      };
    },

    async gameEvents(query: AdminGameEventsQuery) {
      const rows = await repo.gameEvents(query);
      return toCursorPage(rows, query.limit, toGameEvent);
    },

    async searchGames(term: string) {
      // The admin looks after every game, including the ones filtered out
      // of everyone's listings by default.
      const rows = await games.searchLocal(term, 12, true);
      return rows.map(toGameSummary);
    },

    igdbUsage,

    pull(input: AdminPullInput, actorId: string) {
      return gamesService.pullByDate(input, actorId, now());
    },

    async importGame(igdbId: number, actorId: string): Promise<AdminImportResult> {
      const { game, created } = await gamesService.importByIgdbId(igdbId, {
        id: actorId,
        source: "admin",
      });
      return { game: await findGame(game.id), created };
    },

    async setTrending(id: number, isTrending: boolean, actorId: string) {
      await gamesService.setTrending(id, isTrending, actorId);
      return findGame(id);
    },

    async resync(id: number, actorId: string) {
      const ok = await gamesService.resyncDetails(id, actorId);
      if (!ok) {
        throw AppError.upstream(
          "IGDB did not return this game's details. The game log has the reason.",
        );
      }
      return findGame(id);
    },

    async listAnnouncements() {
      return (await repo.listAnnouncements()).map(toAnnouncement);
    },

    async sendAnnouncement(input: AnnouncementInput, actorId: string) {
      const created = await repo.createAnnouncement(input, actorId);
      await repo.broadcastAnnouncement(created.id);
      const card = await repo.findAnnouncement(created.id);
      if (!card) throw AppError.internal("Announcement did not persist");
      return toAnnouncement(card);
    },

    sendTestAnnouncement,

    async listPatchNotes() {
      const [entries, sent] = await Promise.all([
        repo.listPatchNoteEntries(),
        repo.standingPatchNoteAnnouncements(),
      ]);
      const byEntry = new Map(sent.map((a) => [a.patch_note_message_id, a]));
      return entries.map((e) => toPatchNote(e, byEntry.get(e.id)));
    },

    async sendPatchNote(messageId: number, actorId: string) {
      const entry = await repo.findPatchNoteEntry(messageId);
      if (!entry) throw AppError.notFound("Patch notes entry");
      const standing = (await repo.standingPatchNoteAnnouncements()).some(
        (a) => a.patch_note_message_id === messageId,
      );
      const told = () =>
        AppError.conflict(
          "already_exists",
          "Everyone has already been told about this entry",
        );
      if (standing) throw told();

      const note = toPatchNote(entry, undefined);
      const created = await repo
        .createAnnouncement(
          patchNoteAnnouncement(note.title, note.link),
          actorId,
          messageId,
        )
        .catch((error: unknown) => {
          // Two sends at once: the unique index lets only one through.
          if ((error as { code?: string }).code === "23505") throw told();
          throw error;
        });
      await repo.broadcastAnnouncement(created.id);
      const card = await repo.findAnnouncement(created.id);
      if (!card) throw AppError.internal("Announcement did not persist");
      return toPatchNote(entry, card);
    },

    async sendTestPatchNote(messageId: number, actorId: string) {
      const entry = await repo.findPatchNoteEntry(messageId);
      if (!entry) throw AppError.notFound("Patch notes entry");
      const note = toPatchNote(entry, undefined);
      await sendTestAnnouncement(
        patchNoteAnnouncement(note.title, note.link),
        actorId,
      );
    },

    async retractAnnouncement(id: number) {
      const card = await repo.findAnnouncement(id);
      if (!card) throw AppError.notFound("Announcement");
      if (!card.retracted_at) await repo.retractAnnouncement(id);
      const after = await repo.findAnnouncement(id);
      return toAnnouncement(after ?? card);
    },

    async health(): Promise<AdminHealth> {
      const checkedAt = now();

      const started = performance.now();
      let database: AdminHealth["database"];
      try {
        await repo.ping();
        database = {
          ok: true,
          latencyMs: Math.round(performance.now() - started),
          error: null,
        };
      } catch (error) {
        database = {
          ok: false,
          latencyMs: null,
          error: error instanceof Error ? error.message : String(error),
        };
      }

      // Everything below reads the database, so it only runs if that is up.
      const [usage, errors] = database.ok
        ? await Promise.all([
            igdbUsage(),
            repo.serverErrorStats(
              new Date(checkedAt.getTime() - DAY_MS).toISOString(),
            ),
          ])
        : [null, { count: 0, lastAt: null }];

      return {
        checkedAt: checkedAt.toISOString(),
        api: {
          ok: true,
          uptimeSeconds: Math.round((checkedAt.getTime() - bootedAt) / 1000),
          commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
          region: process.env.VERCEL_REGION ?? null,
          node: process.version,
        },
        database,
        igdb: {
          configured: provider.isConfigured,
          todayRequests: usage?.todayRequests ?? 0,
          todayFailures: usage?.todayFailures ?? 0,
          lastRequestAt: usage?.lastRequestAt ?? null,
          lastFailureAt: usage?.lastFailureAt ?? null,
          lastError: usage?.lastError ?? null,
        },
        errors: { last24h: errors.count, lastAt: errors.lastAt },
      };
    },

    async serverErrors(before: number | undefined, limit: number) {
      const rows = await repo.serverErrors(before, limit);
      return toCursorPage(rows, limit, toServerError);
    },
  };
};

export type AdminService = ReturnType<typeof createAdminService>;
