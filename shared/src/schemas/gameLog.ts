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

/** 0-10 in steps of 0.25, mirroring the CHECK constraint on game_logs. */
const RatingSchema = z
  .number()
  .min(0)
  .max(10)
  .refine((n) => Number.isInteger(n * 4), {
    message: "Rating must be a multiple of 0.25",
  });

const IsoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a YYYY-MM-DD date");

const PlatformSlugSchema = z.string().regex(/^[a-z0-9-]+$/);

/**
 * The cross-field refinements deliberately duplicate the database CHECK
 * constraints. That is not redundancy: zod gives a 422 with a field path the
 * form can highlight, while the constraint guarantees the invariant holds no
 * matter which code path writes the row. Validation for the user, constraints
 * for the truth.
 */
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
    achievementsTotal: z.number().int().min(0).nullish(),
    achievementsCompleted: z.number().int().min(0).nullish(),
  })
  .strict();

/** Cross-field rules, applied to both the full and the partial schema. */
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

export const GameLogQuerySchema = z.object({
  status: GameStatusSchema.optional(),
});

/**
 * NOTE a breaking change from the old API: `id` is now the log's own id.
 * It used to be the *game* id, because logs had no identity of their own.
 * The game id moved to `gameId`.
 */
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
  achievementsTotal: number | null;
  achievementsCompleted: number | null;
  createdAt: string;
  updatedAt: string;
}
