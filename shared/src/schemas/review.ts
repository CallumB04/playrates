import { z } from "zod";

/**
 * The write path the old API never had — reviews were readable but there was
 * no way to create one short of editing reviews.json by hand.
 */
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

/** Field renames from the old API: text -> body, public -> isPublic. */
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
  pictureUrl: string | null;
  online: boolean;
}

/**
 * The old response flattened reviewerName / reviewerProfilePicture /
 * reviewerGameLogRating / reviewerGameLogPlatform onto the review. Nesting the
 * author is tidier, and the old code read `reviewer.username` with no null
 * guard, so a single deleted user took down the whole game page.
 */
export interface ReviewWithAuthor extends Review {
  author: ReviewAuthor;
  /** Joined from the author's log of this game, if they have one. */
  rating: number | null;
  platform: string | null;
}
