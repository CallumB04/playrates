import { z } from "zod";
// A type only: profile.ts imports this file, and a value import back would
// be a cycle that leaves one side undefined while the other loads.
import type { ProfileVisibility } from "./profile.js";

const VisibilitySchema = z.enum([
  "everyone",
  "friends",
  "private",
]) satisfies z.ZodType<ProfileVisibility>;

/** What a profile's About card can say, besides the bio, which is always
 *  public. Each has a visibility of its own. */
export const ABOUT_FIELDS = [
  "firstName",
  "pronouns",
  "location",
  "website",
  "discord",
  "steam",
] as const;
export type AboutField = (typeof ABOUT_FIELDS)[number];

export type AboutVisibility = Record<AboutField, ProfileVisibility>;

/** Each field is blank until filled in, and public once it is, which is
 *  why anyone fills them in. The first name can be kept hidden as it's
 *  given, at sign-up; accounts from before that were pinned hidden. */
export const DEFAULT_ABOUT_VISIBILITY: AboutVisibility = {
  firstName: "everyone",
  pronouns: "everyone",
  location: "everyone",
  website: "everyone",
  discord: "everyone",
  steam: "everyone",
};

/** The fields a viewer may see, and only those that are filled in. */
export type ProfileAbout = Partial<Record<AboutField, string>>;

export const AboutVisibilitySchema = z
  .object({
    firstName: VisibilitySchema,
    pronouns: VisibilitySchema,
    location: VisibilitySchema,
    website: VisibilitySchema,
    discord: VisibilitySchema,
    steam: VisibilitySchema,
  })
  .partial()
  .strict();

const STEAM_ID64 = /^7656\d{13}$/;
const STEAM_VANITY = /^[A-Za-z0-9_-]{2,32}$/;
const STEAM_URL =
  /^(?:https?:\/\/)?(?:www\.)?steamcommunity\.com\/(id|profiles)\/([^/?#]+)\/?(?:[?#].*)?$/i;

/**
 * A Steam profile's address from whatever someone pastes: the address
 * itself, a custom name, or the 17-digit id. Null for anything else, so
 * the link on a profile can only ever go to Steam.
 */
export const steamProfileUrl = (input: string): string | null => {
  const value = input.trim();
  const match = STEAM_URL.exec(value);
  if (match) {
    const [, kind, id] = match as unknown as [string, string, string];
    if (kind.toLowerCase() === "profiles") {
      return STEAM_ID64.test(id)
        ? `https://steamcommunity.com/profiles/${id}`
        : null;
    }
    return STEAM_VANITY.test(id) ? `https://steamcommunity.com/id/${id}` : null;
  }
  if (STEAM_ID64.test(value))
    return `https://steamcommunity.com/profiles/${value}`;
  if (STEAM_VANITY.test(value)) return `https://steamcommunity.com/id/${value}`;
  return null;
};

/** A Discord username, or the older name#1234 form. */
export const DISCORD_USERNAME = /^[A-Za-z0-9_.]{2,32}(?:#\d{4})?$/;

/** Blank clears a field; anything else is held to its own rule. */
const clearable = (rule: z.ZodTypeAny) =>
  z
    .union([z.literal(""), rule])
    .nullable()
    .optional();

export const AboutFieldsSchema = z.object({
  pronouns: clearable(z.string().trim().max(30)),
  location: clearable(z.string().trim().max(60)),
  website: clearable(
    z
      .string()
      .trim()
      .max(200)
      .url("Enter a full address, starting https://")
      .refine((v) => /^https?:\/\//i.test(v), "Only web addresses link out"),
  ),
  discord: clearable(
    z.string().trim().regex(DISCORD_USERNAME, "That isn't a Discord username"),
  ),
  steam: clearable(
    z
      .string()
      .trim()
      .max(120)
      .refine(
        (v) => steamProfileUrl(v) !== null,
        "Paste your Steam profile's address, or its custom name",
      ),
  ),
});

/** Favourite games: up to six, in order, each once. */
export const MAX_FAVOURITE_GAMES = 6;

export const SetFavouriteGamesSchema = z
  .object({
    gameIds: z
      .array(z.number().int().positive())
      .max(MAX_FAVOURITE_GAMES)
      .refine((ids) => new Set(ids).size === ids.length, "Each game once"),
  })
  .strict();

export type SetFavouriteGamesInput = z.infer<typeof SetFavouriteGamesSchema>;
