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
const LIBRARY_ART = (appId: string) =>
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

  const url = LIBRARY_ART(appId);
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
