import { z } from "zod";
import { PlayedStatusSchema } from "./gameLog.js";

/** The most of a library one import reads or adds. */
export const STEAM_IMPORT_MAX = 2000;

export const SteamPreviewSchema = z.object({
  /** A profile link, a custom profile name, or a 64-bit Steam id. */
  profile: z.string().trim().min(2).max(200),
});

/** One game from the library, and what it is here, if anything. */
export interface SteamLibraryItem {
  appid: number;
  name: string;
  /** All-time playtime, in hours to one decimal place. */
  hours: number;
  game: { id: number; title: string; coverUrl: string | null } | null;
  /** On the member's shelves already: an import adds no new log. */
  logged: boolean;
  /** Playing if Steam saw it in the last two weeks, played if it has any
   *  playtime, otherwise the backlog. */
  suggested: "played" | "playing" | "backlog";
  /** Has achievements worth asking Steam about: it keeps stats, and it's
   *  been played. Absent from an API before achievements. */
  achievements?: boolean;
  /** For a game already logged: the blanks an import can fill on its Steam
   *  log, or its one log with no platform. Null when there are none. */
  fills?: { platform: boolean; hours: boolean; achievements: boolean } | null;
}

export interface SteamPreview {
  /** The profile's 64-bit id, to ask for its achievements by. Absent from
   *  an API before achievements. */
  steamId?: string;
  /** Most played first. */
  items: SteamLibraryItem[];
  /** How many the library had, including any past the import's limit. */
  total: number;
}

/** The most games one achievements request asks Steam about. */
export const STEAM_ACHIEVEMENTS_BATCH = 20;

export const SteamAchievementsSchema = z
  .object({
    steamId: z.string().regex(/^7656\d{13}$/),
    appids: z
      .array(z.number().int().positive())
      .min(1)
      .max(STEAM_ACHIEVEMENTS_BATCH),
  })
  .strict();

/** One game's achievements: how many it has and how many are unlocked,
 *  or null where it has none. */
export interface SteamAchievements {
  appid: number;
  achievements: { total: number; unlocked: number } | null;
}

const Achieved = {
  achievementsTotal: z.number().int().min(0).max(100_000).nullish(),
  achievementsCompleted: z.number().int().min(0).max(100_000).nullish(),
};

const fitsTotal = (g: {
  achievementsTotal?: number | null;
  achievementsCompleted?: number | null;
}) =>
  g.achievementsTotal == null ||
  g.achievementsCompleted == null ||
  g.achievementsCompleted <= g.achievementsTotal;

const uniqueGames = (games: { gameId: number }[]) =>
  new Set(games.map((g) => g.gameId)).size === games.length;

export const SteamImportSchema = z
  .object({
    games: z
      .array(
        z
          .object({
            gameId: z.number().int().positive(),
            status: z.enum(["played", "playing", "backlog"]),
            hours: z.number().min(0).max(99_999).nullable(),
            rating: z
              .number()
              .min(0.5)
              .max(10)
              .refine((n) => Number.isInteger(n * 2))
              .nullish(),
            playedStatus: PlayedStatusSchema.nullish(),
            ...Achieved,
          })
          .refine(fitsTotal, "Completed achievements cannot exceed the total"),
      )
      .max(STEAM_IMPORT_MAX)
      .refine(uniqueGames, "Each game once"),
    /** Games already logged, whose blanks to fill from Steam. */
    fill: z
      .array(
        z
          .object({
            gameId: z.number().int().positive(),
            hours: z.number().min(0).max(99_999).nullable(),
            ...Achieved,
          })
          .refine(fitsTotal, "Completed achievements cannot exceed the total"),
      )
      .max(STEAM_IMPORT_MAX)
      .refine(uniqueGames, "Each game once")
      .optional(),
  })
  .refine(
    (input) => input.games.length > 0 || (input.fill?.length ?? 0) > 0,
    "Nothing to import",
  );
export type SteamImportInput = z.infer<typeof SteamImportSchema>;

export interface SteamImportResult {
  added: number;
  /** Already on the shelves, so left alone. */
  skipped: number;
  /** Already on the shelves, with blanks filled from Steam. */
  updated?: number;
}
