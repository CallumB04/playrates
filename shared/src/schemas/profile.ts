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

/**
 * `.strict()` is what closes the mass-assignment hole. The old handler did
 * `{ ...user, ...req.body }`, so a caller could overwrite id, email or the
 * password hash by adding keys. Unknown keys are now a 422.
 */
export const UpdateProfileSchema = z
    .object({
        username: UsernameSchema.optional(),
        bio: z.string().max(160, "Bio must be at most 160 characters").optional(),
        pictureUrl: z.string().url().max(2048).nullable().optional(),
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
    bio: string;
    pictureUrl: string | null;
    /** Derived from last_seen_at, not stored. */
    online: boolean;
    createdAt: string;
}
