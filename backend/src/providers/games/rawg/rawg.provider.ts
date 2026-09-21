import { AppError } from "../../../lib/AppError.js";
import type {
  ExternalGame,
  GamePage,
  GamesProvider,
} from "../GamesProvider.js";
import { toExternalGame, type RawgGame } from "./rawg.mapper.js";

const BASE_URL = "https://api.rawg.io/api";
const TIMEOUT_MS = 8_000;
const MAX_ATTEMPTS = 3;

/** Minimum gap between outbound calls. RAWG's free tier is fine on volume but
 *  unhappy about bursts. */
const MIN_INTERVAL_MS = 120;

interface RawgListResponse {
  count?: number;
  next?: string | null;
  results?: RawgGame[];
}

export const createRawgProvider = (
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): GamesProvider => {
  // Chained with a minimum gap, so a burst of searches can't trip RAWG's rate
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

  const request = async <T>(
    path: string,
    params: Record<string, string> = {},
  ): Promise<T> =>
    schedule(async () => {
      const url = new URL(`${BASE_URL}${path}`);
      url.searchParams.set("key", apiKey);
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
      }

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const response = await fetchImpl(url, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });

        if (response.ok) return (await response.json()) as T;

        if (response.status === 404) {
          throw AppError.notFound("Game");
        }

        // retry on throttling and transient upstream failures
        if (response.status === 429 || response.status >= 500) {
          const backoff = 2 ** attempt * 250 + Math.floor(Math.random() * 150);
          await new Promise((r) => setTimeout(r, backoff));
          continue;
        }

        throw AppError.upstream(
          `RAWG request failed with status ${response.status}`,
        );
      }

      throw AppError.upstream("RAWG request failed after retries");
    });

  return {
    name: "rawg",
    isConfigured: true,

    async search(query, limit = 20): Promise<ExternalGame[]> {
      const data = await request<RawgListResponse>("/games", {
        search: query,
        page_size: String(Math.min(limit, 40)),
        // drop the noise of DLC and duplicate editions
        search_precise: "true",
      });
      return (data.results ?? []).map(toExternalGame);
    },

    /**
     * One page ordered by upstream tracker count. The listing endpoint returns
     * forty games per request where detail returns one, so descriptions are
     * missing and get backfilled when someone opens a game.
     */
    async listByPopularity(page, pageSize): Promise<GamePage> {
      const data = await request<RawgListResponse>("/games", {
        ordering: "-added",
        page: String(page),
        page_size: String(Math.min(pageSize, 40)),
      });

      return {
        games: (data.results ?? []).map(toExternalGame),
        total: data.count ?? 0,
        hasNext: Boolean(data.next),
      };
    },

    async getById(externalId): Promise<ExternalGame | null> {
      try {
        const game = await request<RawgGame>(`/games/${externalId}`);
        return toExternalGame(game);
      } catch (error) {
        if (error instanceof AppError && error.status === 404) return null;
        throw error;
      }
    },
  };
};
