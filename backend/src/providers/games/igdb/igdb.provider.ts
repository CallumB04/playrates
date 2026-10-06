import { AppError } from "../../../lib/AppError.js";
import type {
  ExternalGame,
  GamePage,
  GamesProvider,
} from "../GamesProvider.js";
import { toExternalGame, type IgdbGame } from "./igdb.mapper.js";

const API = "https://api.igdb.com/v4";
const TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const TIMEOUT_MS = 10_000;
const MAX_ATTEMPTS = 3;
/** IGDB allows four requests a second; this keeps a margin under it. */
const MIN_INTERVAL_MS = 260;
/** The most IGDB returns in one request. */
const MAX_LIMIT = 500;
/** Renew this long before Twitch says the token runs out. */
const TOKEN_MARGIN_MS = 60 * 60 * 1000;

/** Everything a game page and a tile need, in one request. */
export const GAME_FIELDS = [
  "name",
  "slug",
  "summary",
  "storyline",
  "first_release_date",
  "cover.image_id",
  "artworks.image_id",
  "screenshots.image_id",
  "platforms",
  "genres.slug",
  "genres.name",
  "themes",
  "involved_companies.company.name",
  "involved_companies.developer",
  "involved_companies.publisher",
  "websites.url",
  "websites.type",
  "external_games.external_game_source",
  "age_ratings.organization",
  "age_ratings.rating_category.rating",
  "aggregated_rating",
  "total_rating_count",
].join(",");

/**
 * What counts as a game here: full games, standalone expansions, remakes,
 * remasters and expanded editions, not DLC, bundles, mods or episodes. One
 * entry per game rather than one per edition, and only with a cover, since
 * a tile without one is a grey box.
 */
export const CATALOGUE_FILTER =
  "game_type = (0,4,8,9,10) & version_parent = null & cover != null";

/** IGDB's own page visits, as its popularity data counts them. */
const VISITS = 1;

/** The provider, and the one thing only a catalogue import asks of IGDB. */
export interface IgdbProvider extends GamesProvider {
  /**
   * One page of IGDB's most visited games that pass the catalogue filter,
   * most visited first. Reaches the games nobody has rated yet, which
   * listByPopularity cannot order. A page can come back short of
   * pageSize, since visits count DLC and editions the filter drops.
   */
  listMostVisited(pageNumber: number, pageSize: number): Promise<GamePage>;
}

export interface IgdbRequestOutcome {
  failed: boolean;
  error: string | null;
}

export interface IgdbHooks {
  /** Once per call to IGDB, retries included. Awaited, but a failure here
   *  is swallowed. */
  onRequest?: (outcome: IgdbRequestOutcome) => Promise<void> | void;
}

/** Apicalypse needs its strings quoted, and quotes inside them escaped. */
const quote = (value: string): string =>
  `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

const toUnix = (date: string): number =>
  Math.floor(Date.parse(`${date}T00:00:00Z`) / 1000);

export const createIgdbProvider = (
  clientId: string,
  clientSecret: string,
  fetchImpl: typeof fetch = fetch,
  hooks: IgdbHooks = {},
): IgdbProvider => {
  const report = async (outcome: IgdbRequestOutcome): Promise<void> => {
    try {
      await hooks.onRequest?.(outcome);
    } catch {
      // counting a request must never be why it fails
    }
  };

  let token: { value: string; expiresAt: number } | null = null;

  /** A Twitch app token, kept until near its expiry. Per instance: a cold
   *  start fetches its own, which Twitch is fine with. */
  const accessToken = async (): Promise<string> => {
    if (token && Date.now() < token.expiresAt) return token.value;
    const url = new URL(TOKEN_URL);
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("client_secret", clientSecret);
    url.searchParams.set("grant_type", "client_credentials");
    const response = await fetchImpl(url, {
      method: "POST",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      throw AppError.upstream(`Twitch refused the IGDB credentials (${response.status})`);
    }
    const body = (await response.json()) as {
      access_token: string;
      expires_in: number;
    };
    token = {
      value: body.access_token,
      expiresAt: Date.now() + body.expires_in * 1000 - TOKEN_MARGIN_MS,
    };
    return token.value;
  };

  // Chained with a minimum gap, so a burst of searches can't trip the rate
  // limit. Single-process only: a second instance keeps its own chain.
  let chain: Promise<unknown> = Promise.resolve();
  let lastCallAt = 0;

  const schedule = <T>(task: () => Promise<T>): Promise<T> => {
    const run = chain.then(async () => {
      const wait = Math.max(0, MIN_INTERVAL_MS - (Date.now() - lastCallAt));
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      lastCallAt = Date.now();
      return task();
    });
    // never let one rejection break the queue for everyone behind it
    chain = run.catch(() => undefined);
    return run;
  };

  const query = <T>(endpoint: string, body: string): Promise<T> =>
    schedule(async () => {
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        let response: Response;
        try {
          response = await fetchImpl(`${API}/${endpoint}`, {
            method: "POST",
            headers: {
              "Client-ID": clientId,
              Authorization: `Bearer ${await accessToken()}`,
              Accept: "application/json",
            },
            body,
            signal: AbortSignal.timeout(TIMEOUT_MS),
          });
        } catch (error) {
          await report({
            failed: true,
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }

        const retryable =
          response.status === 429 ||
          response.status === 401 ||
          response.status >= 500;
        await report({
          failed: !response.ok,
          error: response.ok ? null : `IGDB responded ${response.status}`,
        });

        if (response.ok) return (await response.json()) as T;

        // A token Twitch has revoked early: fetch a new one and go again.
        if (response.status === 401) token = null;

        if (retryable) {
          const backoff = 2 ** attempt * 300 + Math.floor(Math.random() * 150);
          await new Promise((r) => setTimeout(r, backoff));
          continue;
        }

        throw AppError.upstream(
          `IGDB request failed with status ${response.status}`,
        );
      }

      throw AppError.upstream("IGDB request failed after retries");
    });

  const games = (where: string, rest: string): Promise<IgdbGame[]> =>
    query<IgdbGame[]>(
      "games",
      `fields ${GAME_FIELDS}; where ${CATALOGUE_FILTER}${where}; ${rest}`,
    );

  /** IGDB says how many match a query at its own endpoint, not in the
   *  listing, so a page only knows there is more by coming back full. */
  const page = async (
    where: string,
    pageNumber: number,
    pageSize: number,
  ): Promise<GamePage> => {
    const limit = Math.min(pageSize, MAX_LIMIT);
    const found = await games(
      where,
      `sort total_rating_count desc; limit ${limit}; offset ${(pageNumber - 1) * limit};`,
    );
    return {
      games: found.map(toExternalGame),
      total: (pageNumber - 1) * limit + found.length,
      hasNext: found.length === limit,
    };
  };

  return {
    name: "igdb",
    isConfigured: true,

    async search(term, limit = 20): Promise<ExternalGame[]> {
      // IGDB's search can't be sorted, so it is asked for more and ordered
      // here, best known first.
      const found = await query<IgdbGame[]>(
        "games",
        `search ${quote(term)}; fields ${GAME_FIELDS}; where ${CATALOGUE_FILTER}; limit ${Math.min(limit * 2, 50)};`,
      );
      return found
        .sort((a, b) => (b.total_rating_count ?? 0) - (a.total_rating_count ?? 0))
        .slice(0, limit)
        .map(toExternalGame);
    },

    async getById(externalId): Promise<ExternalGame | null> {
      // By id alone: an admin bringing in a specific game wants that game,
      // filter or not.
      const [found] = await query<IgdbGame[]>(
        "games",
        `fields ${GAME_FIELDS}; where id = ${Math.trunc(externalId)};`,
      );
      return found ? toExternalGame(found) : null;
    },

    // Rated games only: past them the rating count is null, and IGDB
    // orders the rest arbitrarily. listMostVisited carries on from there.
    listByPopularity(pageNumber, pageSize) {
      return page(" & total_rating_count > 0", pageNumber, pageSize);
    },

    async listMostVisited(pageNumber, pageSize) {
      const limit = Math.min(pageSize, MAX_LIMIT);
      const visited = await query<{ game_id: number }[]>(
        "popularity_primitives",
        `fields game_id; where popularity_type = ${VISITS}; sort value desc; limit ${limit}; offset ${(pageNumber - 1) * limit};`,
      );
      if (visited.length === 0) return { games: [], total: 0, hasNext: false };

      const ids = visited.map((v) => v.game_id);
      const found = await games(
        ` & id = (${ids.join(",")})`,
        `limit ${MAX_LIMIT};`,
      );
      const rank = new Map(ids.map((id, i) => [id, i]));
      return {
        games: found
          .sort((a, b) => rank.get(a.id)! - rank.get(b.id)!)
          .map(toExternalGame),
        total: (pageNumber - 1) * limit + visited.length,
        hasNext: visited.length === limit,
      };
    },

    listByDate({ from, to, page: pageNumber, pageSize }) {
      return page(
        ` & first_release_date >= ${toUnix(from)} & first_release_date < ${toUnix(to) + 86_400}`,
        pageNumber,
        pageSize,
      );
    },
  };
};
