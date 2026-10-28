import { z } from "zod";
import type { Game } from "./game.js";
import type { ProfileAccent } from "./profileAccent.js";

/**
 * The Gaming 25: one game for each of these, in this order, read across
 * the 5×5 grid. Picks are kept by key, so a label can be reworded freely;
 * a key taken out leaves its picks in the database, unshown.
 */
export const GAMING_25_CATEGORIES = [
  { key: "childhood_classic", label: "Childhood Classic" },
  { key: "best_main_character", label: "Best Main Character" },
  { key: "overrated", label: "Overrated" },
  { key: "best_soundtrack", label: "Best Soundtrack" },
  { key: "hardest_game", label: "Hardest Game" },

  { key: "favourite_art_style", label: "Favourite Art Style" },
  { key: "comfort_game", label: "Comfort Game" },
  { key: "best_story", label: "Best Story" },
  { key: "hidden_gem", label: "Hidden Gem" },
  { key: "best_with_friends", label: "Best With Friends" },

  { key: "best_boss_fights", label: "Best Boss Fights" },
  { key: "biggest_letdown", label: "Biggest Letdown" },
  { key: "all_time_favourite", label: "All-Time Favourite" },
  { key: "best_rpg", label: "Best RPG" },
  { key: "best_ending", label: "Best Ending" },

  { key: "keep_coming_back_to", label: "Keep Coming Back To" },
  { key: "best_side_characters", label: "Best Side Characters" },
  { key: "best_villain", label: "Best Villain" },
  { key: "guilty_pleasure", label: "Guilty Pleasure" },
  { key: "best_combat", label: "Best Combat" },

  { key: "remake_it_already", label: "Remake It Already" },
  { key: "best_world", label: "Best World" },
  { key: "didnt_expect_to_love", label: "Didn't Expect to Love" },
  { key: "best_indie", label: "Best Indie" },
  { key: "everyone_should_play", label: "Everyone Should Play" },
] as const;

export type Gaming25Category = (typeof GAMING_25_CATEGORIES)[number]["key"];

export const GAMING_25_SIZE = GAMING_25_CATEGORIES.length;

/** The one in the middle of the grid, which gets the emphasis. */
export const GAMING_25_CENTRE: Gaming25Category = "all_time_favourite";

/** A grid needs this many picks before Most loved will show it. */
export const GAMING_25_SHOWCASE_MIN = 5;

export const Gaming25CategorySchema = z.enum(
  GAMING_25_CATEGORIES.map((c) => c.key) as [
    Gaming25Category,
    ...Gaming25Category[],
  ],
);

export const gaming25Label = (key: Gaming25Category): string =>
  GAMING_25_CATEGORIES.find((c) => c.key === key)!.label;

export const Gaming25PickParamSchema = z.object({
  category: Gaming25CategorySchema,
});

export const SetGaming25PickSchema = z
  .object({ gameId: z.number().int().positive() })
  .strict();

export const GAMING_25_IMAGE_LAYOUTS = ["portrait", "wide"] as const;
export type Gaming25ImageLayout = (typeof GAMING_25_IMAGE_LAYOUTS)[number];

export const Gaming25ImageQuerySchema = z.object({
  layout: z.enum(GAMING_25_IMAGE_LAYOUTS).default("portrait"),
  /** Only there to change the URL when the grid changes. */
  v: z.string().max(64).optional(),
});

export const MostLovedGaming25sQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(24).default(5),
});

export interface Gaming25Owner {
  username: string;
  avatarUrl: string | null;
  accent: ProfileAccent;
}

export interface Gaming25Pick {
  category: Gaming25Category;
  game: Game;
}

/** Someone's grid: the cells they've filled, in category order. */
export interface Gaming25 {
  owner: Gaming25Owner;
  picks: Gaming25Pick[];
  loveCount: number;
  lovedByViewer: boolean;
  /** Null until the first pick. */
  updatedAt: string | null;
}

/** A grid as a card shows it. */
export interface Gaming25Summary {
  owner: Gaming25Owner;
  pickCount: number;
  loveCount: number;
  /** The All-Time Favourite, when there is one. */
  centre: { id: number; title: string; coverUrl: string | null } | null;
  updatedAt: string;
}

export interface LoveResult {
  loveCount: number;
  lovedByViewer: boolean;
}
