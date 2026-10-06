/**
 * The seam between PlayRates and whichever games API is in use (IGDB).
 * Everything above deals in `ExternalGame`, so another source would be a
 * new folder beside igdb/.
 */
export interface ExternalGenre {
  slug: string;
  name: string;
}

export interface ExternalGame {
  externalId: number;
  slug: string;
  title: string;
  description: string;
  /** Wide art, for link previews and backdrops. */
  coverUrl: string | null;
  /** The portrait cover every tile shows. */
  boxArtUrl: string | null;
  /** YYYY-MM-DD */
  releaseDate: string | null;
  /** Already translated to PlayRates platform family slugs. */
  platformSlugs: string[];
  /** The individual machines within those families. */
  systemSlugs: string[];
  genres: ExternalGenre[];
  developers: string[];
  publishers: string[];
  /** The game's own site, not a store page. */
  website: string | null;
  /** In words: "Mature", "Everyone 10+". */
  esrbRating: string | null;
  hasSexualContent: boolean;
  /** Professional reviews, averaged, 0-100. */
  criticScore: number | null;
  /** How many people have rated it upstream: how well known it is. */
  igdbRatingCount: number | null;
  /** Upstream ids of games like it, whether or not they are here. */
  similarIds: number[];
  /** The series it belongs to, if any. */
  series: { id: number; name: string } | null;
  /** Other covers: special editions, then regional releases. Image ids,
   *  with what each one is. */
  altCovers: AltCover[];
}

export interface AltCover {
  imageId: string;
  label: string;
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
  /** One page of the catalogue, best known first. */
  listByPopularity(page: number, pageSize: number): Promise<GamePage>;
  /** Games released between two dates (YYYY-MM-DD, inclusive), best known
   *  first. */
  listByDate(query: {
    from: string;
    to: string;
    page: number;
    pageSize: number;
  }): Promise<GamePage>;
  /** Upstream ids of what is trending now, most first. */
  trendingIds(limit: number): Promise<number[]>;
}

/** Used when no credentials are set. Returns empty results rather than throwing,
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
  async listByDate() {
    return { games: [], total: 0, hasNext: false };
  },
  async trendingIds() {
    return [];
  },
};
