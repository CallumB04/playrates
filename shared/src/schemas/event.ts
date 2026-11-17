import { z } from "zod";
import type { Game } from "./game.js";

/**
 * Events: what's on in gaming. Every event has the same frame (a name, when
 * it is, who runs it, where to watch) and is of a kind, which adds a part of
 * its own. An awards night adds categories, nominees and members' picks; a
 * showcase adds the games it revealed and members' hype for each. A new
 * kind gets its key here and its part's types, and keeps any scoring of
 * its own: badges are the site's, not an event's.
 */

export const EVENT_KINDS = ["awards", "showcase"] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

export const EVENT_KIND_LABELS: Record<EventKind, string> = {
  awards: "Awards",
  showcase: "Showcase",
};

/**
 * The logos the site carries for events, by key. Each is someone else's
 * trademark, shown only to name their event, and always with its credit.
 */
export const EVENT_LOGOS = {
  "the-game-awards": {
    path: "/events/the-game-awards.svg",
    name: "The Game Awards",
    /** Width over height, so it's sized by its height. */
    ratio: 963 / 328,
    credit:
      "The Game Awards name and logo are trademarks of their owner, used here to name the show.",
  },
} as const;

export type EventLogoKey = keyof typeof EVENT_LOGOS;
export type EventLogo = (typeof EVENT_LOGOS)[EventLogoKey] & {
  key: EventLogoKey;
};

export const eventLogo = (key: string | null): EventLogo | null =>
  key && key in EVENT_LOGOS
    ? { key: key as EventLogoKey, ...EVENT_LOGOS[key as EventLogoKey] }
    : null;

/* --------------------------------------------------------------- timing */

/** Where an event stands in time, whatever its kind. */
export type EventTiming = "upcoming" | "live" | "past";

/** An event with no end is a show: over a few hours after it starts. */
const SHOW_HOURS = 4;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export const eventEnd = (event: {
  startsAt: string;
  endsAt: string | null;
}): number =>
  event.endsAt
    ? Date.parse(event.endsAt)
    : Date.parse(event.startsAt) + SHOW_HOURS * HOUR_MS;

export const eventTiming = (
  event: { startsAt: string; endsAt: string | null },
  now: Date,
): EventTiming => {
  const at = now.getTime();
  if (at < Date.parse(event.startsAt)) return "upcoming";
  return at < eventEnd(event) ? "live" : "past";
};

/** How long after it ends an event keeps its card on home. */
export const EVENT_CURRENT_DAYS = 14;

/** Published, and not two weeks gone. */
export const isCurrentEvent = (
  event: {
    publishedAt: string | null;
    startsAt: string;
    endsAt: string | null;
  },
  now: Date,
): boolean =>
  event.publishedAt !== null &&
  now.getTime() < eventEnd(event) + EVENT_CURRENT_DAYS * DAY_MS;

export const eventPath = (slug: string) => `/events/${slug}`;

/* --------------------------------------------------------------- awards */

/** Where an awards night is up to, which decides what picks can do. */
export type AwardsPhase = "open" | "locked" | "results";

export const awardsPhase = (
  awards: { picksCloseAt: string; resultsAt: string | null },
  now: Date,
): AwardsPhase => {
  if (awards.resultsAt) return "results";
  return now.getTime() < Date.parse(awards.picksCloseAt) ? "open" : "locked";
};

export interface AwardsSummary {
  phase: AwardsPhase;
  picksCloseAt: string;
  resultsAt: string | null;
  categoryCount: number;
  nomineeCount: number;
}

export interface AwardNominee {
  id: number;
  /** Null for a person or creator, named by `label` instead. */
  game: Game | null;
  /** A person or creator's name; null when the nominee is just the game. */
  label: string | null;
  /** What a named nominee is there for: a role, a game, a studio. */
  detail: string | null;
  won: boolean;
  /** How many members picked it. */
  picks: number;
}

export interface AwardCategory {
  id: number;
  slug: string;
  name: string;
  blurb: string;
  /** The heading it's grouped under; empty for none. */
  section: string;
  /** The award the night leads with: Game of the Year. */
  headline: boolean;
  nominees: AwardNominee[];
}

export interface AwardsDetail extends AwardsSummary {
  categories: AwardCategory[];
}

/** One member's picks at an awards night: nominee id by category id. */
export type AwardPicks = Record<number, number>;

/** Someone on an awards night's leaderboard; one whose profile you can't
 *  see is there, but not named. */
export type AwardBoardPerson =
  | {
      hidden?: false;
      username: string;
      avatarUrl: string | null;
      accent: string;
      isYou: boolean;
    }
  | { hidden: true };

/** Everyone who called the same number of winners: one line, however
 *  many tied. */
export interface AwardBoardTier {
  called: number;
  players: number;
  /** A few of them, in name order. */
  people: AwardBoardPerson[];
}

/** The leaderboard shows its top few scores, and a few names at each. */
export const AWARD_BOARD_TIERS = 5;
export const AWARD_BOARD_PEOPLE = 4;

/** How an awards night's picks did, once any winner is in: the top scores
 *  and who reached them, and where you stand. */
export interface AwardLeaderboard {
  tiers: AwardBoardTier[];
  /** Everyone who made a pick. */
  total: number;
  /** Awards with a winner so far, out of every award. */
  decided: number;
  categories: number;
  /** Your score and place, ties sharing it; null without picks. */
  you: { called: number; rank: number } | null;
}

/* ------------------------------------------------------------- showcase */

export const REVEAL_TAGS = [
  "premiere",
  "trailer",
  "gameplay",
  "date",
  "shadow-drop",
  "remake",
] as const;
export type RevealTag = (typeof REVEAL_TAGS)[number];

export const REVEAL_TAG_LABELS: Record<RevealTag, string> = {
  premiere: "World premiere",
  trailer: "New trailer",
  gameplay: "Gameplay",
  date: "Release date",
  "shadow-drop": "Out now",
  remake: "Remake",
};

export interface ShowcaseReveal {
  id: number;
  /** Null for something shown before it has a page of its own. */
  game: Game | null;
  /** Its name when there's no game: "A new IP from Remedy". */
  label: string | null;
  tag: RevealTag;
  /** How many members are hyped for it. */
  hype: number;
}

export interface ShowcaseSummary {
  revealCount: number;
}

export interface ShowcaseDetail extends ShowcaseSummary {
  /** In the order they were shown. */
  reveals: ShowcaseReveal[];
}

/** The reveals one member is hyped for, by id. */
export type ShowcaseHype = number[];

/* -------------------------------------------------------------- events */

export interface EventSummary {
  id: number;
  slug: string;
  kind: EventKind;
  name: string;
  /** One line on what it is: also the page's description. */
  tagline: string;
  startsAt: string;
  endsAt: string | null;
  timing: EventTiming;
  organiser: string;
  organiserUrl: string | null;
  /** Where to watch it live. */
  watchUrl: string | null;
  logo: EventLogoKey | null;
  publishedAt: string | null;
  /** Covers for a card, from whatever the kind puts first. */
  covers: string[];
  /** Wide art to sit behind a card. */
  artworkUrl: string | null;
  /** All of its games' wide art, first to last, for a place that needs a
   *  picture other than the one beside it. */
  artworks: string[];
  /** Each kind's own summary: set for its kind, null for any other. */
  awards: AwardsSummary | null;
  showcase: ShowcaseSummary | null;
}

export interface EventDetail extends Omit<EventSummary, "awards" | "showcase"> {
  /** A few paragraphs about it, plain text. */
  about: string;
  awards: AwardsDetail | null;
  showcase: ShowcaseDetail | null;
}

/** What a game did at an event, for the game's own page: nominated or won
 *  at an awards night, shown at a showcase. */
export interface GameEventEntry {
  event: Pick<
    EventSummary,
    "slug" | "kind" | "name" | "startsAt" | "endsAt" | "timing" | "logo"
  > & { artworkUrl: string | null; artworks: string[] };
  awards: {
    phase: AwardsPhase;
    nominations: { category: string; headline: boolean; won: boolean }[];
  } | null;
  showcase: { tag: RevealTag; hype: number } | null;
}

export const EventSlugParamSchema = z.object({
  slug: z
    .string()
    .max(80)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
});

export const AwardCategoryParamSchema = EventSlugParamSchema.extend({
  categoryId: z.coerce.number().int().positive(),
});

export const AwardPickInputSchema = z
  .object({ nomineeId: z.number().int().positive() })
  .strict();

export type AwardPickInput = z.infer<typeof AwardPickInputSchema>;

export const RevealParamSchema = EventSlugParamSchema.extend({
  revealId: z.coerce.number().int().positive(),
});

/* ------------------------------------------------------------- words */

export const EVENTS_WORDS = {
  title: "Events",
  description: "What’s happening, and what’s next.",
};

/** What an event's page is called, by the server and the app alike. */
export const eventWords = (event: {
  name: string;
  tagline: string;
  awards: { phase: AwardsPhase } | null;
  showcase?: unknown;
}) => ({
  title: event.awards
    ? event.awards.phase === "results"
      ? `${event.name}: the winners`
      : `${event.name}: nominees and picks`
    : event.showcase
      ? `${event.name}: every reveal`
      : event.name,
  description: event.tagline || EVENTS_WORDS.description,
});

/* ----------------------------------------------------------------- admin */

const SlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Lowercase letters, numbers and dashes");

const LOGO_KEYS = Object.keys(EVENT_LOGOS) as [EventLogoKey, ...EventLogoKey[]];

export const AdminEventInputSchema = z
  .object({
    kind: z.enum(EVENT_KINDS),
    slug: SlugSchema,
    name: z.string().trim().min(1).max(120),
    tagline: z.string().trim().min(1).max(160),
    about: z.string().trim().max(2000).default(""),
    organiser: z.string().trim().max(120).default(""),
    organiserUrl: z.url().max(300).nullable().default(null),
    watchUrl: z.url().max(300).nullable().default(null),
    logo: z.enum(LOGO_KEYS).nullable().default(null),
    startsAt: z.iso.datetime({ offset: true }),
    endsAt: z.iso.datetime({ offset: true }).nullable().default(null),
    /** An awards night's own part; required for one, refused otherwise. */
    awards: z
      .object({ picksCloseAt: z.iso.datetime({ offset: true }) })
      .strict()
      .nullable()
      .default(null),
  })
  .strict()
  .refine((e) => (e.kind === "awards") === (e.awards !== null), {
    message: "An awards night needs its picks to close",
    path: ["awards"],
  })
  .refine((e) => !e.endsAt || Date.parse(e.endsAt) > Date.parse(e.startsAt), {
    message: "It has to end after it starts",
    path: ["endsAt"],
  });

export type AdminEventInput = z.infer<typeof AdminEventInputSchema>;

export const AdminEventPublishSchema = z
  .object({ published: z.boolean() })
  .strict();

export const AdminCategoryInputSchema = z
  .object({
    slug: SlugSchema,
    name: z.string().trim().min(1).max(120),
    blurb: z.string().trim().max(300).default(""),
    section: z.string().trim().max(60).default(""),
    headline: z.boolean().default(false),
  })
  .strict();

export type AdminCategoryInput = z.infer<typeof AdminCategoryInputSchema>;

/** A game, a name, or a name with the game they're there for. */
export const AdminNomineeInputSchema = z
  .object({
    gameId: z.number().int().positive().nullable().default(null),
    label: z.string().trim().min(1).max(120).nullable().default(null),
    detail: z.string().trim().min(1).max(120).nullable().default(null),
  })
  .strict()
  .refine((n) => n.gameId !== null || n.label !== null, {
    message: "Choose a game or write a name",
    path: ["gameId"],
  });

export type AdminNomineeInput = z.infer<typeof AdminNomineeInputSchema>;

export const AdminWinnerSchema = z.object({ won: z.boolean() }).strict();

/** Ids in the order they should show. */
export const AdminReorderSchema = z
  .object({ ids: z.array(z.number().int().positive()).min(1).max(200) })
  .strict();

export const AdminEventIdParamSchema = z.object({
  eventId: z.coerce.number().int().positive(),
});

export const AdminCategoryIdParamSchema = z.object({
  categoryId: z.coerce.number().int().positive(),
});

export const AdminNomineeIdParamSchema = z.object({
  nomineeId: z.coerce.number().int().positive(),
});

/** A game shown at a showcase, or a name for one without a page yet. */
export const AdminRevealInputSchema = z
  .object({
    gameId: z.number().int().positive().nullable().default(null),
    label: z.string().trim().min(1).max(120).nullable().default(null),
    tag: z.enum(REVEAL_TAGS),
  })
  .strict()
  .refine((r) => r.gameId !== null || r.label !== null, {
    message: "Choose a game or write a name",
    path: ["gameId"],
  });

export type AdminRevealInput = z.infer<typeof AdminRevealInputSchema>;

export const AdminRevealIdParamSchema = z.object({
  revealId: z.coerce.number().int().positive(),
});
