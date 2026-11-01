import { z } from "zod";

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
  /** On the member's shelves already: an import leaves it be. */
  logged: boolean;
  /** Played if it has any playtime, otherwise the backlog. */
  suggested: "played" | "backlog";
}

export interface SteamPreview {
  /** Most played first. */
  items: SteamLibraryItem[];
  /** How many the library had, including any past the import's limit. */
  total: number;
}

export const SteamImportSchema = z.object({
  games: z
    .array(
      z.object({
        gameId: z.number().int().positive(),
        status: z.enum(["played", "backlog"]),
        hours: z.number().min(0).max(99_999).nullable(),
      }),
    )
    .min(1)
    .max(STEAM_IMPORT_MAX)
    .refine(
      (games) => new Set(games.map((g) => g.gameId)).size === games.length,
      "Each game once",
    ),
});
export type SteamImportInput = z.infer<typeof SteamImportSchema>;

export interface SteamImportResult {
  added: number;
  /** Already on the shelves, so left alone. */
  skipped: number;
}
