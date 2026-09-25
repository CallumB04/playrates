import { htmlToText } from "./rawg.mapper.js";
import { steamAppId, type StoreLinksResponse } from "./steamBoxArt.js";

/**
 * The store page's own description, for games that are on Steam.
 *
 * RAWG's copy is usually lifted from Steam, but it arrives flattened on newer
 * listings — a single paragraph with every heading run into the text after
 * it ("an expansive worldEmbrace high degrees of freedom"). No rule can put
 * that back: splitting where a lowercase letter meets a capital also splits
 * PlayStation, FromSoftware and every studio named in camel case. Steam still
 * has the structure, as a <p> per paragraph and an <h2> per heading, and it is
 * the current text rather than whichever revision RAWG last copied.
 *
 * `about_the_game` rather than `detailed_description`: the latter opens with
 * whatever edition the store is selling — Elden Ring's leads with the
 * Shadow of the Erdtree bundle and its contents, not the game.
 */
const appDetailsUrl = (appId: string) =>
  `https://store.steampowered.com/api/appdetails?appids=${appId}&l=english&filters=basic`;

const TIMEOUT_MS = 5_000;

export type AppDetailsResponse = Record<
  string,
  | {
      success?: boolean;
      data?: { steam_appid?: number; about_the_game?: string | null };
    }
  | undefined
>;

/**
 * The text out of an appdetails body. Null where Steam declined, or where the
 * description is empty once the images and video are gone — Cyberpunk 2077's
 * is nothing but image banners.
 *
 * Matched on `steam_appid`, not the key: Steam files some games under the
 * package it is selling, so Elden Ring asked for as 1245620 comes back keyed
 * 2855530.
 */
export const descriptionFromAppDetails = (
  appId: string,
  body: AppDetailsResponse,
): string | null => {
  const entry = Object.values(body).find(
    (candidate) => candidate?.data?.steam_appid === Number(appId),
  );
  const html = entry?.success ? entry.data?.about_the_game : null;
  const text = html ? htmlToText(html) : "";
  return text || null;
};

/** Null wherever Steam has nothing to add, so the caller keeps RAWG's text. */
export const findSteamDescription = async (
  links: StoreLinksResponse,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> => {
  const appId = steamAppId(links);
  if (!appId) return null;

  try {
    const response = await fetchImpl(appDetailsUrl(appId), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return null;
    return descriptionFromAppDetails(
      appId,
      (await response.json()) as AppDetailsResponse,
    );
  } catch {
    // A missing description is not worth failing the detail fetch over.
    return null;
  }
};
