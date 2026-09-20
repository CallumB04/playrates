import type { ExternalGame } from "../GamesProvider.js";

/** RAWG parent platform ids to our slugs. PC is handled separately — RAWG
 *  models storefronts as `stores`, so Steam is decided by STEAM_STORE_ID. */
const PARENT_PLATFORM_SLUGS: Record<number, string> = {
  2: "playstation",
  3: "xbox",
  7: "nintendo-switch",
  4: "mobile", // iOS
  8: "mobile", // Android
};

const PC_PARENT_PLATFORM_ID = 1;
const STEAM_STORE_ID = 1;

/** ESRB ratings that mark a game as 18+. */
const ADULT_ESRB_SLUGS = new Set(["adults-only", "mature"]);

export interface RawgGame {
  id: number;
  slug: string;
  name: string;
  description_raw?: string | null;
  description?: string | null;
  background_image?: string | null;
  released?: string | null;
  esrb_rating?: { id: number; slug: string; name: string } | null;
  metacritic?: number | null;
  rating?: number | null;
  ratings_count?: number | null;
  added?: number | null;
  playtime?: number | null;
  parent_platforms?: { platform: { id: number; slug: string } }[] | null;
  stores?: { store: { id: number; slug: string } }[] | null;
  genres?: { id: number; name: string; slug: string }[] | null;
}

/** Some RAWG endpoints return the description as HTML. */
const stripHtml = (value: string): string =>
  value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * PC becomes "steam" when sold on Steam and "other-pc" otherwise, so the badge
 * says something more useful than "PC". "pc-game-pass" is never inferred —
 * it's a subscription, not a store, and stays the user's own choice.
 */
const toPlatformSlugs = (game: RawgGame): string[] => {
  const slugs = new Set<string>();

  for (const entry of game.parent_platforms ?? []) {
    const id = entry.platform.id;

    if (id === PC_PARENT_PLATFORM_ID) {
      const onSteam = (game.stores ?? []).some(
        (s) => s.store.id === STEAM_STORE_ID,
      );
      slugs.add(onSteam ? "steam" : "other-pc");
      continue;
    }

    const slug = PARENT_PLATFORM_SLUGS[id];
    if (slug) slugs.add(slug);
  }

  return [...slugs];
};

export const toExternalGame = (game: RawgGame): ExternalGame => {
  const description = game.description_raw ?? game.description ?? "";

  return {
    externalId: game.id,
    slug: game.slug,
    title: game.name,
    description: description ? stripHtml(description) : "",
    coverUrl: game.background_image ?? null,
    // RAWG returns an empty string rather than null for unreleased titles
    releaseDate: game.released || null,
    platformSlugs: toPlatformSlugs(game),
    genres: (game.genres ?? []).map((g) => ({
      slug: g.slug,
      name: g.name,
    })),
    isAdult: ADULT_ESRB_SLUGS.has(game.esrb_rating?.slug ?? ""),
    metacritic: game.metacritic ?? null,
    rawgRating: game.rating ?? null,
    rawgRatingCount: game.ratings_count ?? null,
    rawgAddedCount: game.added ?? null,
    // RAWG's playtime is whole hours
    playtimeHours: game.playtime ? Number(game.playtime) : null,
  };
};
