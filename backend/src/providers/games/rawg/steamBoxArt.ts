/**
 * Portrait box art, which RAWG does not have.
 *
 * Every image RAWG serves is landscape — its "background_image" is key art or
 * a screenshot at 16:9 — and the grid shows covers at 3:4, so each one is a
 * centre crop that throws away most of the width. Steam publishes the real
 * portrait capsule for a game at a predictable path, so where a game is on
 * Steam we can have the cover it actually has.
 *
 * No key and no account: this is the same public CDN the store itself serves
 * from. Games whose assets live under a hashed path — mostly very recent
 * releases — have no art here and keep RAWG's image.
 */
export const steamBoxArtUrl = (appId: string) =>
  `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`;

const STEAM_STORE_ID = 1;
const TIMEOUT_MS = 5_000;

interface StoreLink {
  store_id?: number;
  url?: string | null;
}

export interface StoreLinksResponse {
  results?: StoreLink[];
}

/** The app id out of a store link, e.g. .../app/620/ */
export const steamAppId = (links: StoreLinksResponse): string | null => {
  const url = (links.results ?? []).find(
    (link) => link.store_id === STEAM_STORE_ID && link.url,
  )?.url;
  return url ? (/\/app\/(\d+)/.exec(url)?.[1] ?? null) : null;
};

/**
 * The art's URL, or null where Steam has none. Asked for rather than assumed:
 * a 404 would otherwise reach the page as a broken cover, which is worse than
 * the crop it replaced.
 */
export const findSteamBoxArt = async (
  links: StoreLinksResponse,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> => {
  const appId = steamAppId(links);
  if (!appId) return null;

  const url = steamBoxArtUrl(appId);
  try {
    const response = await fetchImpl(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return response.ok ? url : null;
  } catch {
    // Steam being unreachable is not a reason to fail the game's detail fetch.
    return null;
  }
};

/**
 * A title reduced to what two catalogues can agree on: case, punctuation,
 * trademark marks and accents all differ between RAWG and Steam for the same
 * game ("ELDEN RING", "Elden Ring", "NieR:Automata™").
 */
export const normaliseTitle = (title: string): string =>
  title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "");

/** Too short or too plain to identify a game on name alone. */
const AMBIGUOUS_NAME = /^[0-9]*$/;
const MIN_NAME_LENGTH = 3;

/** Marks a name more than one app answers to. */
const COLLIDED = Symbol("collided");

export interface SteamApp {
  appId: string;
  name: string;
}

/**
 * Names to app ids, with every name two apps share dropped rather than
 * guessed at. A wrong cover is worse than the crop it would replace, and the
 * per-game lookup still resolves those properly off RAWG's own store link
 * when someone opens the game.
 */
export const indexByTitle = (apps: SteamApp[]): Map<string, string> => {
  const seen = new Map<string, string | typeof COLLIDED>();

  for (const app of apps) {
    const key = normaliseTitle(app.name);
    if (key.length < MIN_NAME_LENGTH || AMBIGUOUS_NAME.test(key)) continue;

    const existing = seen.get(key);
    if (existing === undefined) seen.set(key, app.appId);
    else if (existing !== app.appId) seen.set(key, COLLIDED);
  }

  const index = new Map<string, string>();
  for (const [key, appId] of seen) {
    if (appId !== COLLIDED) index.set(key, appId);
  }
  return index;
};
