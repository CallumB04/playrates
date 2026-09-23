import type { ExternalGame } from "../GamesProvider.js";

/**
 * RAWG's individual machines to ours, and the family each one rolls up into.
 * Slugs match RAWG's own wherever it has one, so this stays a lookup.
 *
 * PC is absent on purpose: RAWG models storefronts as `stores`, so which
 * family a PC game belongs to depends on where it is sold, not what it runs
 * on. See toPcSlug.
 */
const SYSTEM_FAMILIES: Record<string, string> = {
  playstation5: "playstation",
  playstation4: "playstation",
  playstation3: "playstation",
  playstation2: "playstation",
  playstation1: "playstation",
  "ps-vita": "playstation",
  psp: "playstation",

  "xbox-series-x": "xbox",
  "xbox-one": "xbox",
  xbox360: "xbox",
  "xbox-old": "xbox",

  // The Switch stands alone: it is the one Nintendo machine people are still
  // logging, and it was the whole Nintendo family before this.
  "nintendo-switch": "nintendo-switch",

  "wii-u": "nintendo",
  wii: "nintendo",
  gamecube: "nintendo",
  "nintendo-64": "nintendo",
  snes: "nintendo",
  nes: "nintendo",
  "nintendo-3ds": "nintendo",
  "nintendo-ds": "nintendo",
  "nintendo-dsi": "nintendo",
  "game-boy-advance": "nintendo",
  "game-boy-color": "nintendo",
  "game-boy": "nintendo",

  ios: "mobile",
  android: "mobile",

  macos: "mac",
  macintosh: "mac",
  "apple-ii": "mac",

  linux: "linux",
  web: "web",

  dreamcast: "sega",
  "sega-saturn": "sega",
  genesis: "sega",
  "sega-cd": "sega",
  "sega-32x": "sega",
  "sega-master-system": "sega",
  "game-gear": "sega",

  jaguar: "atari",
  "atari-lynx": "atari",
  "atari-7800": "atari",
  "atari-5200": "atari",
  "atari-2600": "atari",
  "atari-xegs": "atari",
  "atari-st": "atari",
  "atari-8-bit": "atari",
  "atari-flashback": "atari",

  "commodore-amiga": "commodore-amiga",
  neogeo: "neo-geo",
  "3do": "3do",
};

/**
 * Parent platform ids, used only when RAWG lists a machine we have never seen
 * — a new console, say. The game still lands in the right family rather than
 * showing no platform at all.
 */
const PARENT_FAMILIES: Record<number, string> = {
  2: "playstation",
  3: "xbox",
  4: "mobile", // iOS
  5: "mac",
  6: "linux",
  7: "nintendo",
  8: "mobile", // Android
  9: "atari",
  10: "commodore-amiga",
  11: "sega",
  12: "3do",
  13: "neo-geo",
  14: "web",
};

const PC_PARENT_PLATFORM_ID = 1;
const PC_SYSTEM_SLUG = "pc";
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
  platforms?: { platform: { id: number; slug: string } }[] | null;
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
const toPcSlug = (game: RawgGame): string =>
  (game.stores ?? []).some((s) => s.store.id === STEAM_STORE_ID)
    ? "steam"
    : "other-pc";

/**
 * Both levels in one pass: the families a game belongs to, and the individual
 * machines within them. RAWG returns both in the same payload, so the finer
 * list costs nothing extra.
 */
export const toPlatforms = (
  game: RawgGame,
): { platformSlugs: string[]; systemSlugs: string[] } => {
  const families = new Set<string>();
  const systems = new Set<string>();

  for (const entry of game.platforms ?? []) {
    const slug = entry.platform.slug;

    if (slug === PC_SYSTEM_SLUG) {
      // The storefront is the most specific thing a RAWG payload can say
      // about where a PC game was played, so it stands in as the system too.
      const family = toPcSlug(game);
      families.add(family);
      systems.add(family);
      continue;
    }

    const family = SYSTEM_FAMILIES[slug];
    if (!family) continue;
    families.add(family);
    systems.add(slug);
  }

  // A machine RAWG has added since this map was written still lands in its
  // family, rather than the game silently losing a platform.
  for (const entry of game.parent_platforms ?? []) {
    const id = entry.platform.id;

    if (id === PC_PARENT_PLATFORM_ID) {
      const family = toPcSlug(game);
      families.add(family);
      systems.add(family);
      continue;
    }

    const family = PARENT_FAMILIES[id];
    if (!family) continue;
    // Every Nintendo machine shares one parent, so a Switch game would
    // otherwise pick up the retro family as well.
    if (family === "nintendo" && families.has("nintendo-switch")) continue;
    families.add(family);
  }

  return { platformSlugs: [...families], systemSlugs: [...systems] };
};

export const toExternalGame = (game: RawgGame): ExternalGame => {
  const description = game.description_raw ?? game.description ?? "";
  const tagSlugs = (game.tags ?? []).map((t) => t.slug);
  const { platformSlugs, systemSlugs } = toPlatforms(game);

  return {
    externalId: game.id,
    slug: game.slug,
    title: game.name,
    description: description ? stripHtml(description) : "",
    coverUrl: game.background_image ?? null,
    // RAWG returns an empty string rather than null for unreleased titles
    releaseDate: game.released || null,
    platformSlugs,
    systemSlugs,
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
