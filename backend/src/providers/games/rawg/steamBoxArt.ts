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
 * from. Recent releases keep their assets under a hashed folder instead, which
 * no path can be built for — those are looked up in Steam's asset list.
 */
export const steamBoxArtUrl = (appId: string) =>
  `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`;

/* Keyless, like the CDN: the store's own pages call it for the same thing. */
const storeItemsUrl = (appId: string) =>
  `https://api.steampowered.com/IStoreBrowseService/GetItems/v1/?input_json=${encodeURIComponent(
    JSON.stringify({
      ids: [{ appid: Number(appId) }],
      context: { language: "english", country_code: "US" },
      data_request: { include_assets: true },
    }),
  )}`;

/* Where the hashed paths resolve. The cloudflare host 301s here, and a stored
   URL should not cost every visitor a redirect. */
const ASSET_HOST = "https://shared.steamstatic.com/store_item_assets/";

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

export interface StoreItemsResponse {
  response?: {
    store_items?: {
      assets?: {
        /** e.g. "steam/apps/3513350/${FILENAME}?t=1787182292" */
        asset_url_format?: string;
        /** 600x900, the size the predictable path serves. */
        library_capsule_2x?: string;
        /** 300x450. */
        library_capsule?: string;
      };
    }[];
  };
}

/** The portrait capsule out of Steam's asset list, at the larger size where
 *  there is one. Null when the list has no portrait at all. */
export const capsuleFromAssets = (body: StoreItemsResponse): string | null => {
  const assets = body.response?.store_items?.[0]?.assets;
  const file = assets?.library_capsule_2x ?? assets?.library_capsule;
  if (!assets?.asset_url_format || !file) return null;
  return ASSET_HOST + assets.asset_url_format.replace("${FILENAME}", file);
};

/**
 * The art's URL, or null where Steam has none. Asked for rather than assumed:
 * a 404 would otherwise reach the page as a broken cover, which is worse than
 * the crop it replaced.
 *
 * The predictable path first, since it answers most of the catalogue with a
 * HEAD. Only a miss pays for the asset list.
 */
export const findSteamBoxArt = async (
  links: StoreLinksResponse,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> => {
  const appId = steamAppId(links);
  if (!appId) return null;

  // Steam being unreachable is not a reason to fail the game's detail fetch.
  try {
    const url = steamBoxArtUrl(appId);
    const head = await fetchImpl(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (head.ok) return url;

    const listing = await fetchImpl(storeItemsUrl(appId), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!listing.ok) return null;
    return capsuleFromAssets((await listing.json()) as StoreItemsResponse);
  } catch {
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
