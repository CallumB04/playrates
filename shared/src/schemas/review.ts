import { z } from "zod";
import { PaginationSchema } from "./common.js";

export const ReviewInputSchema = z
  .object({
    body: z
      .string()
      .trim()
      .min(1, "A review cannot be empty")
      .max(5000, "A review must be at most 5000 characters"),
    isPublic: z.boolean().default(true),
  })
  .strict();

export type ReviewInput = z.infer<typeof ReviewInputSchema>;

export interface Review {
  id: number;
  gameId: number;
  body: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewAuthor {
  id: string;
  username: string;
  avatarUrl: string | null;
  online: boolean;
}

/** The game a review is about, so a review can be rendered away from it. */
export interface ReviewGame {
  id: number;
  title: string;
  coverUrl: string | null;
}

/** A review with its author, and the rating from that author's log. */
export interface ReviewWithAuthor extends Review {
  author: ReviewAuthor;
  /** Joined from the author's log of this game, if they have one. */
  rating: number | null;
  /**
   * Hours on the clock when the review was written. "9.0" from someone who
   * put eighty hours in is a different claim from "9.0" after two.
   */
  hoursPlayed: number | null;
  platform: string | null;
  game: ReviewGame;
}

/**
 * Rating sorts read the review_cards view, which pre-joins each author's log
 * — the rating is not on the reviews table, so ordering by it needs the join
 * to happen in SQL. Unrated reviews sort last either way.
 */
export const REVIEW_SORTS = [
  "recent",
  "oldest",
  "rating-high",
  "rating-low",
] as const;
export const ReviewSortSchema = z.enum(REVIEW_SORTS).default("recent");
export type ReviewSort = z.infer<typeof ReviewSortSchema>;

export const ReviewQuerySchema = PaginationSchema.extend({
  sort: ReviewSortSchema,
});
