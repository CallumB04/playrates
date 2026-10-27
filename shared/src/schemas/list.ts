import { z } from "zod";
import { PaginationSchema } from "./common.js";
import type { Game } from "./game.js";
import { ProfileVisibilitySchema, type ProfileVisibility } from "./profile.js";
import { ProfileAccentSchema, type ProfileAccent } from "./profileAccent.js";

export const MAX_LIST_GAMES = 500;
export const MAX_LISTS = 100;
export const MAX_LIST_COVERS = 4;
export const LIST_NAME_MAX = 80;
export const LIST_DESCRIPTION_MAX = 500;

const uniqueIds = (max: number) =>
  z
    .array(z.number().int().positive())
    .max(max)
    .refine((ids) => new Set(ids).size === ids.length, "Each game once");

const ListFieldsSchema = z.object({
  name: z.string().trim().min(1, "Give it a name").max(LIST_NAME_MAX),
  description: z.string().trim().max(LIST_DESCRIPTION_MAX),
  visibility: ProfileVisibilitySchema,
  /** None until its owner picks one. */
  colour: ProfileAccentSchema.nullable(),
  ranked: z.boolean(),
});

export const CreateListSchema = ListFieldsSchema.partial({
  description: true,
  visibility: true,
  colour: true,
  ranked: true,
})
  .extend({
    /** Games to start it with: Add to list's "New list" passes the one. */
    gameIds: uniqueIds(MAX_LIST_GAMES).optional(),
  })
  .strict();
export type CreateListInput = z.infer<typeof CreateListSchema>;

export const UpdateListSchema = ListFieldsSchema.partial()
  .extend({
    /** The covers, in order; null goes back to the first four games. */
    coverGameIds: uniqueIds(MAX_LIST_COVERS).nullable().optional(),
  })
  .strict();
export type UpdateListInput = z.infer<typeof UpdateListSchema>;

/** The whole list's games, in order. Leaving one out removes it. */
export const SetListGamesSchema = z
  .object({ gameIds: uniqueIds(MAX_LIST_GAMES) })
  .strict();

export const AddListGameSchema = z
  .object({ gameId: z.number().int().positive() })
  .strict();

export const LIST_SORTS = ["top", "recent"] as const;
export type ListSort = (typeof LIST_SORTS)[number];

export const ListsQuerySchema = PaginationSchema.extend({
  sort: z.enum(LIST_SORTS).default("recent"),
});

export const MyListsQuerySchema = z.object({
  /** Marks the lists this game is in, for Add to list. */
  gameId: z.coerce.number().int().positive().optional(),
});

export const ListIdParamSchema = z.object({
  listId: z.coerce.number().int().positive(),
});

export const ListGameParamSchema = ListIdParamSchema.extend({
  gameId: z.coerce.number().int().positive(),
});

export const GameListsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(24).default(6),
});

export interface ListCover {
  id: number;
  title: string;
  coverUrl: string | null;
}

export interface ListOwner {
  username: string;
  avatarUrl: string | null;
  accent: ProfileAccent;
}

/** A list as its card shows it. */
export interface GameListSummary {
  id: number;
  name: string;
  description: string;
  visibility: ProfileVisibility;
  colour: ProfileAccent | null;
  ranked: boolean;
  gameCount: number;
  voteCount: number;
  votedByViewer: boolean;
  /** Up to four, in place: the ones picked, then the list's first games. */
  covers: ListCover[];
  owner: ListOwner;
  createdAt: string;
  updatedAt: string;
}

export interface GameListEntry {
  game: Game;
  /** Its place, from 1. */
  rank: number;
  addedAt: string;
}

/** A list with all of its games: at most MAX_LIST_GAMES, so no paging. */
export interface GameListDetail extends GameListSummary {
  /** What its owner picked, or null for the first four. */
  coverGameIds: number[] | null;
  games: GameListEntry[];
}

/** One of your own lists, for Add to list. */
export interface MyListOption {
  id: number;
  name: string;
  colour: ProfileAccent | null;
  visibility: ProfileVisibility;
  gameCount: number;
  /** The game asked about is in it. */
  hasGame: boolean;
}
