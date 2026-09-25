import { z } from "zod";

export const GAME_STATUSES = [
  "played",
  "playing",
  "backlog",
  "wishlist",
] as const;

export const PLAYED_STATUSES = [
  "finished",
  "mastered",
  "shelved",
  "retired",
] as const;

export const GameStatusSchema = z.enum(GAME_STATUSES);
export const PlayedStatusSchema = z.enum(PLAYED_STATUSES);

export type GameStatus = z.infer<typeof GameStatusSchema>;
export type PlayedStatus = z.infer<typeof PlayedStatusSchema>;

/** 0.5-10 in steps of 0.5, mirroring the CHECK constraint on game_logs.
 *  Zero is not the bottom of the scale, it is the absence of a rating, and
 *  that is what null is for. */
const RatingSchema = z
  .number()
  .min(0.5)
  .max(10)
  .refine((n) => Number.isInteger(n * 2), {
    message: "Rating must be a multiple of 0.5",
  });

const IsoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a YYYY-MM-DD date");

const PlatformSlugSchema = z.string().regex(/^[a-z0-9-]+$/);

/** These duplicate the database CHECKs on purpose. Zod gives a 422 with a
 *  field path the form can highlight; the constraint holds regardless of what
 *  writes the row. */
/** The plain object, kept separate so the PATCH schema can `.partial()` it. */
const GameLogFieldsSchema = z
  .object({
    status: GameStatusSchema,
    playedStatus: PlayedStatusSchema.nullish(),
    rating: RatingSchema.nullish(),
    hoursPlayed: z.number().min(0).max(99_999).nullish(),
    hoursToBeat: z.number().min(0).max(99_999).nullish(),
    startDate: IsoDateSchema.nullish(),
    finishDate: IsoDateSchema.nullish(),
    platform: PlatformSlugSchema.nullish(),
    system: PlatformSlugSchema.nullish(),
    achievementsTotal: z.number().int().min(0).nullish(),
    achievementsCompleted: z.number().int().min(0).nullish(),
  })
  .strict();

/** Applied to the full and partial schemas separately — `.partial()` can't be
 *  called on a schema that already has refinements. */
const withCrossFieldChecks = <T extends z.ZodTypeAny>(schema: T) =>
  schema
    .refine(
      (v: z.infer<T>) =>
        v.achievementsTotal == null ||
        v.achievementsCompleted == null ||
        v.achievementsCompleted <= v.achievementsTotal,
      {
        message: "Completed achievements cannot exceed the total",
        path: ["achievementsCompleted"],
      },
    )
    .refine(
      (v: z.infer<T>) =>
        !v.startDate || !v.finishDate || v.finishDate >= v.startDate,
      {
        message: "Finish date must be on or after the start date",
        path: ["finishDate"],
      },
    );

export const GameLogInputSchema = withCrossFieldChecks(GameLogFieldsSchema);

export type GameLogInput = z.infer<typeof GameLogFieldsSchema>;

export const GameLogPatchSchema = withCrossFieldChecks(
  GameLogFieldsSchema.partial(),
);

export type GameLogPatch = z.infer<
  ReturnType<typeof GameLogFieldsSchema.partial>
>;

/**
 * How a shelf is ordered. Two of these sort on the game rather than the log,
 * and every one of them decides what figure the tile prints underneath, so the
 * ordering is legible rather than mysterious.
 */
export const GAME_LOG_SORTS = [
  "rating",
  "gameRating",
  "metacritic",
  "played",
  "title",
  "released",
  "completion",
] as const;

export const GameLogSortSchema = z.enum(GAME_LOG_SORTS).default("rating");
export type GameLogSort = (typeof GAME_LOG_SORTS)[number];

export const SortDirectionSchema = z.enum(["asc", "desc"]).default("desc");
export type SortDirection = z.infer<typeof SortDirectionSchema>;

/** "none" is a filter for played logs carrying no substatus, which is a real
 *  choice and not the absence of one. */
export const PlayedStatusFilterSchema = z.enum([...PLAYED_STATUSES, "none"]);
export type PlayedStatusFilter = z.infer<typeof PlayedStatusFilterSchema>;

export const GameLogQuerySchema = z.object({
  status: GameStatusSchema.optional(),
  playedStatus: PlayedStatusFilterSchema.optional(),
  sort: GameLogSortSchema,
  direction: SortDirectionSchema,
});

/** `id` is the log's own id; `gameId` is the game it refers to. */
export interface GameLog {
  id: number;
  gameId: number;
  status: GameStatus;
  playedStatus: PlayedStatus | null;
  rating: number | null;
  hoursPlayed: number | null;
  hoursToBeat: number | null;
  startDate: string | null;
  finishDate: string | null;
  platform: string | null;
  /** The machine, where one was named. `platform` is its family. */
  system: string | null;
  achievementsTotal: number | null;
  achievementsCompleted: number | null;
  createdAt: string;
  updatedAt: string;
}

/** A log reduced to what a "have I logged this?" lookup needs. Unpaginated:
 *  a partial answer makes a tile show the wrong action. */
export interface GameLogSummary {
  gameId: number;
  status: GameStatus;
  playedStatus: PlayedStatus | null;
  rating: number | null;
}

/** Totals across a user's whole shelf — the log list is paginated, so these
 *  can't be summed client-side. */
export interface UserStats {
  logCount: number;
  byStatus: Record<string, number>;
  hoursPlayed: number;
  averageRating: number | null;
  ratingCount: number;
}

export const UserStatsQuerySchema = z.object({
  year: z.coerce.number().int().min(1970).max(2200).optional(),
});
