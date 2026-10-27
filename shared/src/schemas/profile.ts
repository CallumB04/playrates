import { z } from "zod";
import { ProfileAccentSchema, type ProfileAccent } from "./profileAccent.js";
import {
  AboutFieldsSchema,
  AboutVisibilitySchema,
  type AboutVisibility,
  type ProfileAbout,
} from "./about.js";

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

/** Checked against the runtime's own zone list: the column has no constraint,
 *  because a CHECK cannot hold the subquery pg_timezone_names would need. */
export const TimeZoneSchema = z
  .string()
  .trim()
  .max(64)
  .refine((zone) => {
    try {
      new Intl.DateTimeFormat("en-GB", { timeZone: zone });
      return true;
    } catch {
      return false;
    }
  }, "Unknown time zone");

/** Who can see the rest of a profile: games, reviews, friends and threads,
 *  and the figures worked out from them. The card with the name, picture and
 *  bio is always public. Reviews still show on the games they review. */
export const PROFILE_VISIBILITIES = ["everyone", "friends", "private"] as const;
export const ProfileVisibilitySchema = z.enum(PROFILE_VISIBILITIES);
export type ProfileVisibility = z.infer<typeof ProfileVisibilitySchema>;

/** The one rule, so the API's gate and the page's "private" plate agree. */
export const canSeeProfile = (
  visibility: ProfileVisibility,
  viewer: { isOwner: boolean; isFriend: boolean },
): boolean =>
  viewer.isOwner ||
  visibility === "everyone" ||
  (visibility === "friends" && viewer.isFriend);

/** The views under a profile, each at /user/:username/:view. The profile
 *  itself is the bare /user/:username. Here so the server renders the same
 *  set the app routes. */
export const PROFILE_VIEWS = [
  "games",
  "reviews",
  "community",
  "friends",
] as const;
export type ProfileView = (typeof PROFILE_VIEWS)[number];

export const isProfileView = (value: string): value is ProfileView =>
  (PROFILE_VIEWS as readonly string[]).includes(value);

/** A picture from one of the game's backdrops. Set on its own route rather
 *  than with the rest of the profile, since it is checked against the game
 *  and the owner's logs of it. */
export const SetProfileBackgroundSchema = z
  .object({
    gameId: z.number().int().positive(),
    url: z.string().url().max(500),
    /** Which part of the picture shows, 0 the top to 100 the bottom. */
    position: z.number().int().min(0).max(100).optional(),
  })
  .strict();

/** Just above the middle, where a game page sits its own art: the subject
 *  of a screenshot is rarely at the very top or bottom. */
export const DEFAULT_BACKGROUND_POSITION = 30;

export type SetProfileBackgroundInput = z.infer<
  typeof SetProfileBackgroundSchema
>;

/** `.strict()` rejects unknown keys, so only these fields are editable. */
export const UpdateProfileSchema = z
  .object({
    username: UsernameSchema.optional(),
    bio: z.string().max(160, "Bio must be at most 160 characters").optional(),
    /* No avatarUrl. A picture is uploaded to /profiles/me/avatar and the URL
       is written there, so the only pictures anyone can wear are ones this
       API stored. */
    accent: ProfileAccentSchema.optional(),
    /** Opt-in. Off keeps sexually explicit games out of every listing. */
    showSexualContent: z.boolean().optional(),
    /** Optional display name. Empty string clears it. */
    firstName: z.string().trim().max(40).nullable().optional(),
    timezone: TimeZoneSchema.optional(),
    /** Opt-out, so the default is the permissive one. */
    hideOnline: z.boolean().optional(),
    /** Asks search engines to leave the profile page out. */
    hideFromSearch: z.boolean().optional(),
    profileVisibility: ProfileVisibilitySchema.optional(),
    /** Who sees each About field; only the ones named change. */
    aboutVisibility: AboutVisibilitySchema.optional(),
  })
  .merge(AboutFieldsSchema)
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
  avatarUrl: string | null;
  /** The colour this profile wears. Every profile has one. */
  accent: ProfileAccent;
  /** A game's picture across the top of the page. None by default. The
   *  game is null once it has left the catalogue. */
  background: {
    url: string;
    gameId: number | null;
    /** 0 shows the top of the picture, 100 the bottom. */
    position: number;
  } | null;
  /** Derived from last_seen_at, not stored. */
  online: boolean;
  /** Public because the page has to say it: a noindex is read by anyone. */
  hideFromSearch: boolean;
  /** Public so the page can say why the rest of it is missing. */
  profileVisibility: ProfileVisibility;
  /** The About fields this viewer may see, and only those filled in. */
  about: ProfileAbout;
  createdAt: string;
}

/**
 * Your own profile. Everything above plus the settings behind it, which are
 * nobody else's business — a profile page is public, so the public shape
 * carries only what a profile page shows.
 */
export interface MyProfile extends Profile {
  /** Optional. Greetings use this before falling back to the username. */
  firstName: string | null;
  /** Who sees each About field. `about` here is every field filled in. */
  aboutVisibility: AboutVisibility;
  showSexualContent: boolean;
  /** IANA zone name. Timestamps render in this; dates you picked do not move. */
  timezone: string;
  hideOnline: boolean;
  /** When the first-login welcome was dismissed. Null until it has been. */
  onboardedAt: string | null;
  /** When the username was picked. Null on a Google or Discord signup until
   *  its owner picks one. */
  usernameChosenAt: string | null;
  /** Can post patch notes and remove anything in the community. */
  isAdmin: boolean;
}
