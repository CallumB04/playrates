import {
  STEAM_IMPORT_MAX,
  type SteamImportInput,
  type SteamImportResult,
  type SteamPreview,
} from "@playrates/shared";
import { AppError } from "../../lib/AppError.js";
import type { GamesProvider } from "../../providers/games/GamesProvider.js";
import { parseSteamProfile, type SteamClient } from "../../providers/steam.js";
import type { GameLogsRepository } from "../game-logs/gameLogs.repository.js";
import type { GameEventsRepository } from "../games/gameEvents.repository.js";
import type { GamesRepository } from "../games/games.repository.js";
import type { ProfilesRepository } from "../profiles/profiles.repository.js";

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
  gameLogs: Pick<GameLogsRepository, "listByUserAndGames" | "createMany">;
  gameEvents: Pick<GameEventsRepository, "record">;
  profiles: Pick<ProfilesRepository, "findById">;
}) => {
  const ready = (): SteamClient => {
    if (!client || !provider.isConfigured)
      throw AppError.notFound("Steam import");
    return client;
  };

  const loggedIds = async (userId: string, gameIds: number[]) =>
    new Set(
      (await gameLogs.listByUserAndGames(userId, gameIds)).map(
        (l) => l.game_id,
      ),
    );

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
      const logged = await loggedIds(
        userId,
        rows.map((r) => r.id),
      );

      return {
        total: owned.length,
        items: library.map((g) => {
          const igdb = igdbOf.get(g.appid);
          const row = igdb === undefined ? undefined : byIgdb.get(igdb);
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
            logged: row ? logged.has(row.id) : false,
            suggested: g.playtime > 0 ? "played" : "backlog",
          };
        }),
      };
    },

    /** Adds what the member chose, leaving alone anything already on their
     *  shelves. One statement, so a big library isn't three hundred
     *  requests. */
    async import(
      userId: string,
      input: SteamImportInput,
    ): Promise<SteamImportResult> {
      ready();
      const already = await loggedIds(
        userId,
        input.games.map((g) => g.gameId),
      );
      const fresh = input.games.filter((g) => !already.has(g.gameId));
      const added = await gameLogs.createMany(
        userId,
        fresh.map((g) => ({
          gameId: g.gameId,
          patch: {
            status: g.status,
            hours_played: g.status === "played" && g.hours ? g.hours : null,
          },
        })),
      );
      return { added, skipped: input.games.length - fresh.length };
    },
  };
};

export type SteamService = ReturnType<typeof createSteamService>;
