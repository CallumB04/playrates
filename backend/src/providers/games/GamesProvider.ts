/**
 * The seam between PlayRates and whichever games API is in use.
 *
 * Everything above this interface deals in `ExternalGame`, with platform slugs
 * already mapped to ours — so swapping RAWG for IGDB (or adding a fallback)
 * is a new folder under providers/games/ and nothing else changes.
 */
export interface ExternalGame {
  externalId: number;
  slug: string;
  title: string;
  description: string;
  coverUrl: string | null;
  /** YYYY-MM-DD */
  releaseDate: string | null;
  /** Already translated to PlayRates platform slugs. */
  platformSlugs: string[];
  isAdult: boolean;
  popularity: number | null;
  hoursToBeat: number | null;
  raw: unknown;
}

export interface GamesProvider {
  readonly name: string;
  /** True when the provider has the configuration it needs to run. */
  readonly isConfigured: boolean;
  search(query: string, limit?: number): Promise<ExternalGame[]>;
  getById(externalId: number): Promise<ExternalGame | null>;
}

/**
 * Stand-in used when no API key is configured. Returning empty results rather
 * than throwing means the app runs fully on its local catalogue, which is what
 * makes the key optional for development.
 */
export const nullGamesProvider: GamesProvider = {
  name: "none",
  isConfigured: false,
  async search() {
    return [];
  },
  async getById() {
    return null;
  },
};
