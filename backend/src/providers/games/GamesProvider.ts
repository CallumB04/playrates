/**
 * The seam between PlayRates and whichever games API is in use. Everything
 * above deals in `ExternalGame`, so swapping RAWG for IGDB is a new folder.
 */
export interface ExternalGenre {
  slug: string;
  name: string;
}

export interface ExternalGame {
  externalId: number;
  slug: string;
  title: string;
  /** Empty when it came from a listing; the detail endpoint fills it in. */
  description: string;
  coverUrl: string | null;
  /** Portrait art where the store has it; RAWG only has landscape. Detail
   *  fetches only — the listing has no store links. */
  boxArtUrl: string | null;
  /** YYYY-MM-DD */
  releaseDate: string | null;
  /** Already translated to PlayRates platform family slugs. */
  platformSlugs: string[];
  /** The individual machines within those families. */
  systemSlugs: string[];
  genres: ExternalGenre[];
  /** Detail-endpoint only; a listing row carries neither. */
  developers: string[];
  publishers: string[];
  /** Detail-endpoint only. The game's own site, not a store page. */
  website: string | null;
  /** In both responses, so the bulk import fills this one in. */
  esrbRating: string | null;
  hasSexualContent: boolean;
  contentTags: string[];
  metacritic: number | null;
  rawgRating: number | null;
  rawgRatingCount: number | null;
  /** How many upstream users track it; the popularity ordering. */
  rawgAddedCount: number | null;
  playtimeHours: number | null;
}

export interface GamePage {
  games: ExternalGame[];
  /** Total matching the query upstream, for progress reporting. */
  total: number;
  hasNext: boolean;
}

export interface GamesProvider {
  readonly name: string;
  /** True when the provider has the configuration it needs to run. */
  readonly isConfigured: boolean;
  search(query: string, limit?: number): Promise<ExternalGame[]>;
  getById(externalId: number): Promise<ExternalGame | null>;
  /** One page of the catalogue, most-tracked first. Carries everything except
   *  the description. */
  listByPopularity(page: number, pageSize: number): Promise<GamePage>;
}

/** Used when no API key is set. Returns empty results rather than throwing,
 *  so the app runs on its local catalogue. */
export const nullGamesProvider: GamesProvider = {
  name: "none",
  isConfigured: false,
  async search() {
    return [];
  },
  async getById() {
    return null;
  },
  async listByPopularity() {
    return { games: [], total: 0, hasNext: false };
  },
};
