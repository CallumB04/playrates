import { z } from "zod";
import { BooleanQuerySchema, PaginationSchema } from "./common.js";

/** Field names changed from the old API: trending -> isTrending, eighteenPlus -> isAdult. */
export interface Game {
  id: number;
  rawgId: number | null;
  slug: string;
  title: string;
  description: string;
  coverUrl: string | null;
  releaseDate: string | null;
  /** Platform slugs. Same shape as the old `platforms: string[]`. */
  platforms: string[];
  isAdult: boolean;
  isTrending: boolean;
  hoursToBeat: number | null;
}

export interface GameStats {
  logCount: number;
  byStatus: Record<string, number>;
  averageRating: number | null;
  ratingCount: number;
}

/**
 * Filters the library page used to apply client-side over the whole
 * catalogue. Pushing them into SQL is what lets the catalogue grow past a
 * few dozen games.
 */
export const GameQuerySchema = PaginationSchema.extend({
  search: z.string().trim().max(200).optional(),
  platform: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  trending: BooleanQuerySchema.optional(),
  includeAdult: BooleanQuerySchema.default(true),
  /** Requires auth: excludes games the caller has already logged. */
  excludeLogged: BooleanQuerySchema.default(false),
});

export type GameQuery = z.infer<typeof GameQuerySchema>;

export const GameSearchSchema = PaginationSchema.extend({
  q: z.string().trim().min(1).max(200),
  /** Allow falling through to the upstream provider on a cache miss. */
  remote: BooleanQuerySchema.default(true),
});

export const GameImportSchema = z
  .object({
    rawgId: z.number().int().positive(),
  })
  .strict();

export const PlatformSchema = z.object({
  slug: z.string(),
  displayName: z.string(),
  iconClass: z.string(),
  sortOrder: z.number(),
});

export type Platform = z.infer<typeof PlatformSchema>;
