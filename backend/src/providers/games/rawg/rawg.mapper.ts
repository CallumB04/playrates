import type { ExternalGame } from "../GamesProvider.js";

/** RAWG parent platform ids to our slugs. PC is handled separately: RAWG
 *  models storefronts as `stores`, so Steam comes from STEAM_STORE_ID. */
const PARENT_PLATFORM_SLUGS: Record<number, string> = {
  2: "playstation",
  3: "xbox",
  7: "nintendo-switch",
  4: "mobile", // iOS
  8: "mobile", // Android
};

const PC_PARENT_PLATFORM_ID = 1;
const STEAM_STORE_ID = 1;

/**
 * Sexual content, named directly. Deliberately excludes the "mature" ESRB
 * rating, which most large releases carry and which marks violence.
 */
const SEXUAL_ESRB_SLUGS = new Set(["adults-only"]);

const SEXUAL_TAG_SLUGS = new Set([
  "nsfw",
  "sexual-content",
  "adult",
  "hentai",
  "erotic",
  "eroge",
  "pornographic",
  "dating-sim",
]);

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
  tags?: { id: number; name: string; slug: string }[] | null;
}

/** Some RAWG endpoints return the description as HTML. */
const stripHtml = (value: string): string =>
  value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * PC becomes "steam" when it's sold on Steam and "other-pc" otherwise.
 * "pc-game-pass" is never inferred — it's a subscription, not a store.
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
  const tagSlugs = (game.tags ?? []).map((t) => t.slug);

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
    contentTags: tagSlugs,
    hasSexualContent:
      SEXUAL_ESRB_SLUGS.has(game.esrb_rating?.slug ?? "") ||
      tagSlugs.some((slug) => SEXUAL_TAG_SLUGS.has(slug)),
    metacritic: game.metacritic ?? null,
    rawgRating: game.rating ?? null,
    rawgRatingCount: game.ratings_count ?? null,
    rawgAddedCount: game.added ?? null,
    // RAWG's playtime is whole hours
    playtimeHours: game.playtime ? Number(game.playtime) : null,
  };
};
