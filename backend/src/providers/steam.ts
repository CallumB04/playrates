import { steamProfileUrl } from "@playrates/shared";
import { AppError } from "../lib/AppError.js";

/** One game in a Steam library. */
export interface SteamGame {
  appid: number;
  name: string;
  /** Minutes, all time. */
  playtime: number;
}

export interface SteamClient {
  /** A custom profile name to its 64-bit id, or null if there's none. */
  resolveVanity(name: string): Promise<string | null>;
  /** "private" when the profile hides its game details. */
  ownedGames(steamId: string): Promise<SteamGame[] | "private">;
}

/** Where someone points us at their profile: a link, a custom name, or
 *  the id itself. */
export type SteamProfileRef =
  { kind: "id"; id: string } | { kind: "vanity"; name: string };

/** What steamProfileUrl accepts, as the id or the name to look up. */
export const parseSteamProfile = (input: string): SteamProfileRef | null => {
  const url = steamProfileUrl(input);
  if (!url) return null;
  const [, kind, value] = /\/(profiles|id)\/([^/]+)$/.exec(url)!;
  return kind === "profiles"
    ? { kind: "id", id: value! }
    : { kind: "vanity", name: value! };
};

const TIMEOUT_MS = 10_000;

export const createSteamClient = (
  key: string,
  fetchImpl: typeof fetch = fetch,
): SteamClient => {
  const call = async <T>(path: string, params: Record<string, string>) => {
    const url = new URL(`https://api.steampowered.com/${path}`);
    url.search = new URLSearchParams({
      key,
      format: "json",
      ...params,
    }).toString();
    let response: Response;
    try {
      response = await fetchImpl(url, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      throw AppError.upstream("Steam isn't answering");
    }
    if (!response.ok) throw AppError.upstream("Steam isn't answering");
    return (await response.json()) as T;
  };

  return {
    async resolveVanity(name) {
      const body = await call<{
        response?: { success?: number; steamid?: string };
      }>("ISteamUser/ResolveVanityURL/v1/", { vanityurl: name });
      return body.response?.success === 1
        ? (body.response.steamid ?? null)
        : null;
    },

    async ownedGames(steamId) {
      const body = await call<{
        response?: {
          game_count?: number;
          games?: { appid: number; name?: string; playtime_forever?: number }[];
        };
      }>("IPlayerService/GetOwnedGames/v1/", {
        steamid: steamId,
        include_appinfo: "1",
        include_played_free_games: "1",
      });
      // A private library answers with an empty response, not an error.
      if (!body.response?.games) return "private";
      return body.response.games.map((g) => ({
        appid: g.appid,
        name: g.name ?? `App ${g.appid}`,
        playtime: g.playtime_forever ?? 0,
      }));
    },
  };
};
