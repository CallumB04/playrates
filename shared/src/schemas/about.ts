import { z } from "zod";
// A type only: profile.ts imports this file, and a value import back would
// be a cycle that leaves one side undefined while the other loads.
import type { ProfileVisibility } from "./profile.js";
import type { Game } from "./game.js";
import type { GameStatus, PlayedStatus } from "./gameLog.js";

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

/** On the About card beside the fields, but not typed in there: their age,
 *  worked out from a birthday given once, when they joined, and when they
 *  were last on. */
export const ABOUT_FACTS = ["age", "joined", "lastSeen"] as const;
export type AboutFact = (typeof ABOUT_FACTS)[number];

/** Everything on the About card that has a say over who sees it. */
export type AboutKey = AboutField | AboutFact;
export const ABOUT_KEYS: readonly AboutKey[] = [
  ...ABOUT_FIELDS,
  ...ABOUT_FACTS,
];

export type AboutVisibility = Record<AboutKey, ProfileVisibility>;

/** Each field is blank until filled in, and public once it is, which is
 *  why anyone fills them in. The first name can be kept hidden as it's
 *  given, at sign-up; accounts from before that were pinned hidden. An age
 *  starts with friends: members can be 13. When someone joined and was last
 *  on were public before they could be hidden, and stay so until changed. */
export const DEFAULT_ABOUT_VISIBILITY: AboutVisibility = {
  firstName: "everyone",
  pronouns: "everyone",
  location: "everyone",
  website: "everyone",
  discord: "everyone",
  steam: "everyone",
  age: "friends",
  joined: "everyone",
  lastSeen: "everyone",
};

/** The facts a viewer may see. `lastSeen` is a day, YYYY-MM-DD in UTC:
 *  the hour someone was on is more than a profile needs to say. */
export interface ProfileFacts {
  age?: number;
  joined?: string;
  lastSeen?: string;
}

/** Whole years from a birthday to a day, both YYYY-MM-DD. */
export const ageOn = (birthDate: string, today: string): number => {
  const [by, bm, bd] = birthDate.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const [ty, tm, td] = today.split("-").map(Number) as [number, number, number];
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
};

/** A birthday as Edit profile takes it: a real date, 13 or over, as
 *  signing up asks, and a believable one. */
export const BirthDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date")
  .refine(
    (v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)),
    "That isn’t a date",
  )
  .refine(
    (v) => ageOn(v, new Date().toISOString().slice(0, 10)) >= 13,
    "You need to be 13 or over",
  )
  .refine(
    (v) => ageOn(v, new Date().toISOString().slice(0, 10)) <= 120,
    "Check the year",
  );

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
    age: VisibilitySchema,
    joined: VisibilitySchema,
    lastSeen: VisibilitySchema,
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
const clearable = <T extends z.ZodType>(rule: T) =>
  z
    .union([z.literal(""), rule])
    .nullable()
    .optional();

export const AboutFieldsSchema = z.object({
  pronouns: clearable(z.string().trim().max(30, "30 characters at most")),
  location: clearable(z.string().trim().max(60, "60 characters at most")),
  website: clearable(
    z
      .string()
      .trim()
      .max(200, "200 characters at most")
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
      .max(120, "120 characters at most")
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

/** A favourite with the status of its owner's log that speaks for the game,
 *  or null when they have no log of it. Their games are seen by whoever may
 *  see their favourites, so this asks nothing more. */
export interface FavouriteGame extends Game {
  ownerStatus: {
    status: GameStatus;
    playedStatus: PlayedStatus | null;
  } | null;
}
