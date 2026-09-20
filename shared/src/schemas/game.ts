import { z } from "zod";
import { BooleanQuerySchema, PaginationSchema } from "./common.js";

export interface Game {
  id: number;
  rawgId: number | null;
  slug: string;
  title: string;
  description: string;
  coverUrl: string | null;
  releaseDate: string | null;
  /** Platform slugs, e.g. ["steam", "xbox"]. */
  platforms: string[];
  isAdult: boolean;
  isTrending: boolean;
  /** RAWG's average playtime in hours, not a time-to-beat estimate. */
  playtimeHours: number | null;
  genres: string[];
  metacritic: number | null;
  /** RAWG's own 0-5 community score, not a PlayRates rating. */
  rawgRating: number | null;
  rawgRatingCount: number | null;
}

export interface GameStats {
  logCount: number;
  byStatus: Record<string, number>;
  averageRating: number | null;
  ratingCount: number;
  /** Twenty buckets of 0.5, so the rating plate shows a shape, not just a mean. */
  ratingBuckets: number[];
}

const IsoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a YYYY-MM-DD date");

/**
 * How the catalogue is ordered.
 *
 * "logged" counts PlayRates logs; "popular" is RAWG's added-to-collection
 * figure, kept because it is populated across the whole catalogue where our
 * own count starts at zero for anything nobody has logged yet.
 */
export const GAME_SORTS = [
  "logged",
  "popular",
  "title",
  "released",
  "rating",
] as const;
export const GameSortSchema = z.enum(GAME_SORTS).default("popular");
export type GameSort = z.infer<typeof GameSortSchema>;

/**
 * Library filters. These run in SQL rather than in the browser so the page
 * never has to hold the whole catalogue in memory.
 */
export const GameQuerySchema = PaginationSchema.extend({
  search: z.string().trim().max(200).optional(),
  platform: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  genre: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  trending: BooleanQuerySchema.optional(),
  includeAdult: BooleanQuerySchema.default(true),
  /** Requires auth: excludes games the caller has already logged. */
  excludeLogged: BooleanQuerySchema.default(false),
  sort: GameSortSchema,
  /** Release-date window, so "new releases" can exclude unreleased titles. */
  releasedAfter: IsoDateSchema.optional(),
  releasedBefore: IsoDateSchema.optional(),
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
  sortOrder: z.number(),
});

export type Platform = z.infer<typeof PlatformSchema>;

export const GenreSchema = z.object({
  slug: z.string(),
  name: z.string(),
});

export type Genre = z.infer<typeof GenreSchema>;
