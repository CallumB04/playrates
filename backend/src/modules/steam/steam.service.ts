import {
  STEAM_IMPORT_MAX,
  type SteamAchievements,
  type SteamImportInput,
  type SteamImportResult,
  type SteamPreview,
} from "@playrates/shared";
import type { GameLogRow } from "../../types/database.types.js";
import { AppError } from "../../lib/AppError.js";
import type { GamesProvider } from "../../providers/games/GamesProvider.js";
import { parseSteamProfile, type SteamClient } from "../../providers/steam.js";
import type { GameLogsRepository } from "../game-logs/gameLogs.repository.js";
import type { GameEventsRepository } from "../games/gameEvents.repository.js";
import type { GamesRepository } from "../games/games.repository.js";
import type { ProfilesRepository } from "../profiles/profiles.repository.js";

/** Steam is a platform family with one console of its own, both "steam". */
const STEAM = "steam";
const FILL_AT_ONCE = 10;

/** Which of a game's logs a Steam import fills in: its Steam one, or else
 *  its one with no platform, which may well be from an earlier import. A
 *  game logged only on other consoles has nothing for Steam to fill. */
export const fillTarget = (logs: GameLogRow[]): GameLogRow | undefined =>
  logs.find((l) => l.system_slug === STEAM) ??
  logs.find((l) => l.system_slug === null);

/** What Steam knows that the log leaves blank, and nothing else. */
export const blanksFilled = (
  log: GameLogRow,
  steam: {
    hours: number | null;
    achievementsTotal?: number | null;
    achievementsCompleted?: number | null;
  },
): Partial<GameLogRow> => {
  const patch: Partial<GameLogRow> = {};
  if (log.system_slug === null) {
    patch.platform_slug = STEAM;
    patch.system_slug = STEAM;
  }
  if (log.hours_played === null && steam.hours) {
    patch.hours_played = steam.hours;
  }
  if (
    log.achievements_total === null &&
    log.achievements_completed === null &&
    steam.achievementsTotal != null &&
    steam.achievementsCompleted != null
  ) {
    patch.achievements_total = steam.achievementsTotal;
    patch.achievements_completed = steam.achievementsCompleted;
  }
  return patch;
};

export const createSteamService = ({
  client,
  provider,
  games,
  gameLogs,
  gameEvents,
  profiles,
}: {
  /** Null without a Steam key: the import isn't offered. */
  client: SteamClient | null;
  provider: Pick<GamesProvider, "isConfigured" | "fromSteam" | "getByIds">;
  games: Pick<
    GamesRepository,
    "existingIgdbIds" | "upsertMany" | "listByIgdbIds"
  >;
  gameLogs: Pick<
    GameLogsRepository,
    "listByUserAndGames" | "createMany" | "update"
  >;
  gameEvents: Pick<GameEventsRepository, "record">;
  profiles: Pick<ProfilesRepository, "findById">;
}) => {
  const ready = (): SteamClient => {
    if (!client || !provider.isConfigured)
      throw AppError.notFound("Steam import");
    return client;
  };

  /** Each logged game's logs, by game. */
  const logsByGame = async (userId: string, gameIds: number[]) => {
    const byGame = new Map<number, GameLogRow[]>();
    for (const log of await gameLogs.listByUserAndGames(userId, gameIds)) {
      byGame.set(log.game_id, [...(byGame.get(log.game_id) ?? []), log]);
    }
    return byGame;
  };

  return {
    available(): boolean {
      return client !== null && provider.isConfigured;
    },

    /** The library, matched to the catalogue, for the member to look over
     *  before anything is added. Games IGDB knows but we don't yet are
     *  brought in on the way. */
    async preview(userId: string, profile: string): Promise<SteamPreview> {
      const steam = ready();
      const ref = parseSteamProfile(profile);
      if (!ref) {
        throw AppError.validation(
          "That isn't a Steam profile link, name or id",
        );
      }
      const steamId =
        ref.kind === "id" ? ref.id : await steam.resolveVanity(ref.name);
      if (!steamId) throw AppError.notFound("Steam profile");

      const owned = await steam.ownedGames(steamId);
      if (owned === "private") {
        throw new AppError(
          422,
          "steam_private",
          "That Steam library is private",
        );
      }
      const library = [...owned]
        .sort((a, b) => b.playtime - a.playtime)
        .slice(0, STEAM_IMPORT_MAX);

      const igdbOf = await provider.fromSteam(library.map((g) => g.appid));
      const igdbIds = [...new Set(igdbOf.values())];
      const known = new Set(await games.existingIgdbIds(igdbIds));
      const missing = igdbIds.filter((id) => !known.has(id));
      if (missing.length > 0) {
        await games.upsertMany(await provider.getByIds(missing));
      }

      const member = await profiles.findById(userId);
      const rows = await games.listByIgdbIds(
        igdbIds,
        member?.show_sexual_content ?? false,
      );
      const byIgdb = new Map(rows.map((r) => [r.igdb_id, r]));
      if (missing.length > 0) {
        await gameEvents.record(
          rows
            .filter((r) => r.igdb_id !== null && missing.includes(r.igdb_id))
            .map((r) => ({
              kind: "igdb_import" as const,
              source: "import" as const,
              gameId: r.id,
              actorId: userId,
              data: { igdbId: r.igdb_id, title: r.title, from: "steam" },
            })),
        );
      }
      const logged = await logsByGame(
        userId,
        rows.map((r) => r.id),
      );

      return {
        steamId,
        total: owned.length,
        items: library.map((g) => {
          const igdb = igdbOf.get(g.appid);
          const row = igdb === undefined ? undefined : byIgdb.get(igdb);
          const logs = row ? logged.get(row.id) : undefined;
          const target = logs && fillTarget(logs);
          const fills = target && {
            platform: target.system_slug === null,
            hours: target.hours_played === null && g.playtime > 0,
            achievements:
              target.achievements_total === null &&
              g.hasStats &&
              g.playtime > 0,
          };
          return {
            appid: g.appid,
            name: g.name,
            hours: Math.round(g.playtime / 6) / 10,
            game: row
              ? {
                  id: row.id,
                  title: row.title,
                  coverUrl: row.box_art_url ?? row.cover_url,
                }
              : null,
            logged: !!logs,
            suggested:
              g.recentPlaytime > 0
                ? "playing"
                : g.playtime > 0
                  ? "played"
                  : "backlog",
            achievements: g.hasStats && g.playtime > 0,
            fills:
              fills && (fills.platform || fills.hours || fills.achievements)
                ? fills
                : null,
          };
        }),
      };
    },

    /** A batch of a library's achievements, asked of Steam a game at a
     *  time, as it has no call for many. */
    async achievements(
      steamId: string,
      appids: number[],
    ): Promise<SteamAchievements[]> {
      const steam = ready();
      const found = await Promise.all(
        appids.map((appid) => steam.achievements(steamId, appid)),
      );
      if (found.includes("private")) {
        throw new AppError(
          422,
          "steam_private",
          "That Steam profile's achievements are private",
        );
      }
      return appids.map((appid, i) => ({
        appid,
        achievements: found[i] as SteamAchievements["achievements"],
      }));
    },

    /**
     * Adds what the member chose, on Steam, leaving alone anything already
     * on their shelves: one statement, so a big library isn't three hundred
     * requests. Then fills the blanks on games they'd logged already, and
     * only the blanks: nothing they set is written over.
     */
    async import(
      userId: string,
      input: SteamImportInput,
    ): Promise<SteamImportResult> {
      ready();
      const fill = input.fill ?? [];
      const already = await logsByGame(userId, [
        ...input.games.map((g) => g.gameId),
        ...fill.map((f) => f.gameId),
      ]);
      const fresh = input.games.filter((g) => !already.has(g.gameId));
      const added = await gameLogs.createMany(
        userId,
        fresh.map((g) => ({
          gameId: g.gameId,
          patch: {
            status: g.status,
            platform_slug: STEAM,
            system_slug: STEAM,
            hours_played: g.status !== "backlog" && g.hours ? g.hours : null,
            rating: g.rating ?? null,
            played_status:
              g.status === "played" ? (g.playedStatus ?? null) : null,
            achievements_total: g.achievementsTotal ?? null,
            achievements_completed: g.achievementsCompleted ?? null,
          },
        })),
      );

      const patches = fill.flatMap((f) => {
        const logs = already.get(f.gameId);
        const target = logs && fillTarget(logs);
        if (!target) return [];
        const patch = blanksFilled(target, f);
        return Object.keys(patch).length > 0 ? [{ id: target.id, patch }] : [];
      });
      // A few at a time: each is a request of its own.
      for (let i = 0; i < patches.length; i += FILL_AT_ONCE) {
        await Promise.all(
          patches
            .slice(i, i + FILL_AT_ONCE)
            .map(({ id, patch }) => gameLogs.update(id, patch)),
        );
      }

      return {
        added,
        skipped: input.games.length - fresh.length,
        updated: patches.length,
      };
    },
  };
};

export type SteamService = ReturnType<typeof createSteamService>;
