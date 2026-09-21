import { z } from "zod";

export const UsernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(24, "Username must be at most 24 characters")
  .regex(/^[A-Za-z0-9_]+$/, "Letters, numbers and underscores only");

export const PasswordSchema = z
  .string()
  .min(8, "Password needs to be at least 8 characters long")
  .max(72, "Password must be at most 72 characters");

export const EmailSchema = z.string().trim().toLowerCase().email();

/** `.strict()` rejects unknown keys, so only these fields are editable. */
export const UpdateProfileSchema = z
  .object({
    username: UsernameSchema.optional(),
    bio: z.string().max(160, "Bio must be at most 160 characters").optional(),
    avatarUrl: z.string().url().max(2048).nullable().optional(),
    /** Opt-in. Off keeps sexually explicit games out of every listing. */
    showSexualContent: z.boolean().optional(),
    /** Optional display name. Empty string clears it. */
    firstName: z.string().trim().max(40).nullable().optional(),
  })
  .strict();

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

export const CheckUsernameSchema = z.object({
  username: UsernameSchema,
});

/** A user profile as returned by the API. */
export interface Profile {
  id: string;
  username: string;
  /** Optional. Greetings use this before falling back to the username. */
  firstName: string | null;
  bio: string;
  avatarUrl: string | null;
  /** Derived from last_seen_at, not stored. */
  online: boolean;
  showSexualContent: boolean;
  createdAt: string;
}
