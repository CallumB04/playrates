import { AppError } from "../../../lib/AppError.js";
import type {
  ExternalGame,
  GamePage,
  GamesProvider,
} from "../GamesProvider.js";
import type { AltCover } from "../GamesProvider.js";
import {
  altNames,
  pickBackdrops,
  pickBanner,
  pickSeries,
  STEAM_SOURCE,
  toExternalGame,
  type IgdbGame,
} from "./igdb.mapper.js";

const API = "https://api.igdb.com/v4";
const TOKEN_URL = "https://id.twitch.tv/oauth2/token";
/** How long to wait on IGDB, and how many times to ask. A page of 500
 *  games with everything expanded can take a few seconds, and a job can
 *  wait. Someone waiting on a search or an import can't: past 15s their
 *  browser has given up anyway. */
interface Patience {
  timeoutMs: number;
  attempts: number;
}
const PATIENT: Patience = { timeoutMs: 20_000, attempts: 3 };
const QUICK: Patience = { timeoutMs: 6_000, attempts: 2 };
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
  "similar_games",
  "collections.name",
  "franchises.name",
  "game_localizations.cover.image_id",
  "game_localizations.region.name",
  "alternative_names.name",
  "alternative_names.comment",
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
/** Steam's peak concurrent players over the last day. Steam only, so no
 *  console exclusives, but the one figure that moves with what people are
 *  playing now; the others barely change from month to month. */
const STEAM_PEAK_PLAYERS = 5;

/** The provider, and the one thing only a catalogue import asks of IGDB. */
export interface IgdbProvider extends GamesProvider {
  /**
   * One page of IGDB's most visited games that pass the catalogue filter,
   * most visited first. Reaches the games nobody has rated yet, which
   * listByPopularity cannot order. A page can come back short of
   * pageSize, since visits count DLC and editions the filter drops.
   */
  listMostVisited(pageNumber: number, pageSize: number): Promise<GamePage>;
  /** The series of up to 500 games, by IGDB id, for re-deriving it alone. */
  seriesOf(igdbIds: number[]): Promise<Map<number, ExternalGame["series"]>>;
  /** Just the banner of each game, for when the rule that picks it changes. */
  bannersOf(igdbIds: number[]): Promise<Map<number, string | null>>;
  /** Just the other names of up to 500 games, for filling them in alone. */
  altNamesOf(igdbIds: number[]): Promise<Map<number, string[]>>;
}

export interface IgdbRequestOutcome {
  failed: boolean;
  error: string | null;
}

export interface IgdbHooks {
  /** Once per call to IGDB, retries included. Awaited, but a failure here
   *  is swallowed. */
  onRequest?: (outcome: IgdbRequestOutcome) => Promise<void> | void;
  /** Takes the next turn under IGDB's rate limit, shared by every
   *  instance: how long to wait before calling. Without it, each instance
   *  keeps its own gap, which several instances together can overrun. */
  nextTurn?: (minIntervalMs: number) => Promise<number>;
  /** Where the Twitch token is kept between instances, so a cold start
   *  doesn't fetch one of its own. */
  tokenStore?: {
    get(): Promise<string | null>;
    set(token: string, ttlMs: number): Promise<void>;
  };
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
  // Set when IGDB turned the shared token away, so the next one is fetched
  // fresh rather than read back from the store.
  let sharedRevoked = false;

  /** A Twitch app token, kept until near its expiry. Per instance: a cold
   *  start fetches its own, which Twitch is fine with. */
  const accessToken = async (): Promise<string> => {
    if (token && Date.now() < token.expiresAt) return token.value;
    const shared = sharedRevoked
      ? null
      : await hooks.tokenStore?.get().catch(() => null);
    if (shared) {
      // How long it has left isn't kept with it; a minute is safe, and a
      // revoked one is caught by the 401 below.
      token = { value: shared, expiresAt: Date.now() + 60_000 };
      return shared;
    }
    const url = new URL(TOKEN_URL);
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("client_secret", clientSecret);
    url.searchParams.set("grant_type", "client_credentials");
    const response = await fetchImpl(url, {
      method: "POST",
      signal: AbortSignal.timeout(QUICK.timeoutMs),
    });
    if (!response.ok) {
      throw AppError.upstream(
        `Twitch refused the IGDB credentials (${response.status})`,
      );
    }
    const body = (await response.json()) as {
      access_token: string;
      expires_in: number;
    };
    token = {
      value: body.access_token,
      expiresAt: Date.now() + body.expires_in * 1000 - TOKEN_MARGIN_MS,
    };
    sharedRevoked = false;
    await hooks.tokenStore
      ?.set(token.value, token.expiresAt - Date.now())
      .catch(() => undefined);
    return token.value;
  };

  // Chained with a minimum gap, so a burst of searches can't trip the rate
  // limit. The gap is shared between instances when nextTurn is given;
  // otherwise each instance keeps its own.
  let chain: Promise<unknown> = Promise.resolve();
  let lastCallAt = 0;

  const schedule = <T>(task: () => Promise<T>): Promise<T> => {
    const run = chain.then(async () => {
      const shared = await hooks
        .nextTurn?.(MIN_INTERVAL_MS)
        .catch(() => undefined);
      const wait =
        shared ?? Math.max(0, MIN_INTERVAL_MS - (Date.now() - lastCallAt));
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      lastCallAt = Date.now();
      return task();
    });
    // never let one rejection break the queue for everyone behind it
    chain = run.catch(() => undefined);
    return run;
  };

  const query = <T>(
    endpoint: string,
    body: string,
    { timeoutMs, attempts }: Patience = PATIENT,
  ): Promise<T> =>
    schedule(async () => {
      for (let attempt = 0; attempt < attempts; attempt++) {
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
            signal: AbortSignal.timeout(timeoutMs),
          });
        } catch (error) {
          await report({
            failed: true,
            error: error instanceof Error ? error.message : String(error),
          });
          // A dropped connection or a timeout is as passing as a 429.
          if (attempt === attempts - 1) throw error;
          await new Promise((r) => setTimeout(r, 2 ** attempt * 300));
          continue;
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
        if (response.status === 401) {
          token = null;
          sharedRevoked = true;
        }

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

  /**
   * Maps a batch, with each game's edition covers. Editions are games of
   * their own on IGDB (version_parent), so it is one more request for the
   * whole batch rather than one per game.
   */
  const withEditions = async (
    found: IgdbGame[],
    patience: Patience = PATIENT,
  ): Promise<ExternalGame[]> => {
    if (found.length === 0) return [];
    const byParent = new Map<number, AltCover[]>();
    const ids = found.map((g) => g.id).join(",");
    for (let offset = 0; ; offset += MAX_LIMIT) {
      const editions = await query<
        {
          version_parent: number;
          version_title?: string;
          name: string;
          cover?: { image_id: string };
        }[]
      >(
        "games",
        `fields version_parent,version_title,name,cover.image_id; where version_parent = (${ids}) & cover != null; sort id asc; limit ${MAX_LIMIT}; offset ${offset};`,
        patience,
      );
      for (const e of editions) {
        const list = byParent.get(e.version_parent) ?? [];
        list.push({
          imageId: e.cover!.image_id,
          label: e.version_title ?? e.name,
        });
        byParent.set(e.version_parent, list);
      }
      if (editions.length < MAX_LIMIT) break;
    }
    return found.map((g) => toExternalGame(g, byParent.get(g.id) ?? []));
  };

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
      games: await withEditions(found),
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
        QUICK,
      );
      return withEditions(
        found
          .sort(
            (a, b) => (b.total_rating_count ?? 0) - (a.total_rating_count ?? 0),
          )
          .slice(0, limit),
        QUICK,
      );
    },

    async getById(externalId): Promise<ExternalGame | null> {
      // By id alone: an admin bringing in a specific game wants that game,
      // filter or not.
      const [found] = await query<IgdbGame[]>(
        "games",
        `fields ${GAME_FIELDS}; where id = ${Math.trunc(externalId)};`,
        QUICK,
      );
      return found ? (await withEditions([found], QUICK))[0]! : null;
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
        games: await withEditions(
          found.sort((a, b) => rank.get(a.id)! - rank.get(b.id)!),
        ),
        total: (pageNumber - 1) * limit + visited.length,
        hasNext: visited.length === limit,
      };
    },

    async trendingIds(limit) {
      const played = await query<{ game_id: number }[]>(
        "popularity_primitives",
        `fields game_id; where popularity_type = ${STEAM_PEAK_PLAYERS}; sort value desc; limit ${Math.min(limit, MAX_LIMIT)};`,
      );
      return played.map((p) => p.game_id);
    },

    async fromSteam(appids) {
      const found = new Map<number, number>();
      for (let i = 0; i < appids.length; i += MAX_LIMIT) {
        const uids = appids
          .slice(i, i + MAX_LIMIT)
          .map((id) => `"${Math.trunc(id)}"`)
          .join(",");
        const rows = await query<{ game?: number; uid?: string }[]>(
          "external_games",
          `fields game,uid; where external_game_source = ${STEAM_SOURCE} & uid = (${uids}); limit ${MAX_LIMIT};`,
        );
        for (const row of rows) {
          const appid = Number(row.uid);
          // A Steam app can be listed against more than one IGDB game
          // (a bundle, a remaster); the first is kept.
          if (row.game && Number.isFinite(appid) && !found.has(appid)) {
            found.set(appid, row.game);
          }
        }
      }
      return found;
    },

    async getByIds(externalIds) {
      const all: IgdbGame[] = [];
      for (let i = 0; i < externalIds.length; i += MAX_LIMIT) {
        const ids = externalIds
          .slice(i, i + MAX_LIMIT)
          .map((id) => Math.trunc(id))
          .join(",");
        all.push(
          ...(await query<IgdbGame[]>(
            "games",
            `fields ${GAME_FIELDS}; where id = (${ids}); limit ${MAX_LIMIT};`,
          )),
        );
      }
      return withEditions(all);
    },

    async seriesOf(igdbIds) {
      const found = await query<IgdbGame[]>(
        "games",
        `fields franchises.name,collections.name; where id = (${igdbIds.join(",")}); limit ${MAX_LIMIT};`,
      );
      return new Map(found.map((g) => [g.id, pickSeries(g)]));
    },

    async bannersOf(igdbIds) {
      const found = await query<IgdbGame[]>(
        "games",
        `fields screenshots.image_id,artworks.image_id; where id = (${igdbIds.join(",")}); limit ${MAX_LIMIT};`,
      );
      return new Map(found.map((g) => [g.id, pickBanner(g)]));
    },

    async backdropsOf(igdbId) {
      const [found] = await query<IgdbGame[]>(
        "games",
        `fields screenshots.image_id,artworks.image_id; where id = ${igdbId};`,
        QUICK,
      );
      return found ? pickBackdrops(found) : [];
    },

    async altNamesOf(igdbIds) {
      const found = await query<IgdbGame[]>(
        "games",
        `fields name,alternative_names.name,alternative_names.comment; where id = (${igdbIds.join(",")}); limit ${MAX_LIMIT};`,
      );
      return new Map(found.map((g) => [g.id, altNames(g)]));
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
