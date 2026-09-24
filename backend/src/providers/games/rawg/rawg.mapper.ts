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

/**
 * Games the rules below get wrong, checked by hand.
 *
 * Every one is here because a single contributed tag or a word in its title
 * says something the game does not: The Sexy Brutale is a puzzle game, Dream
 * Daddy is wholesome, Ghost Master is from 2003. A short list of names is
 * worth more than a weaker rule, which would let real ones through.
 */
const NOT_SEXUAL_TITLES = new Set([
  "the sexy brutale",
  "ghost master",
  "genesis noir",
  "dream daddy: a dad dating simulator",
  "forgotten memories: remastered edition",
  "vampire: the masquerade - redemption",
]);

/**
 * A title that says outright what the game is.
 *
 * RAWG's tags are contributed, not curated, and they miss: a fifth of the
 * games with "Hentai" in the name carried no tag marking them at all, so the
 * filter let them through. The title is the one thing such a game is never
 * coy about.
 *
 * Substrings, not whole words. Anchoring to word boundaries let Softporn
 * Adventure, Porntris, Boobserman, Milfylicious, QLewds and Simusex through,
 * and every one of them came back from a search run with explicit content
 * switched off.
 *
 * The exceptions are the collisions with ordinary English, each carved out
 * by hand rather than by weakening the rule: the -sex counties, Milford,
 * XXXL. "adult" only counts in a phrase — Adult Only, adult sim — because on
 * its own it means grown-up, and it was hiding jigsaw puzzles and colouring
 * books.
 *
 * It errs towards hiding: an opted-in viewer still sees everything, and the
 * alternative is a child being shown a game called Hentai Girl.
 */
const SEXUAL_TITLE_PATTERN =
  /hentai|futanari|nukige|nsfw|bdsm|porn|ecchi|eroge|erotic|ahegao|lewd|boob|pussy|nude|nudit|(?<!es)(?<!us)(?<!dle)sex|milf(?!ord)|(?<![a-z])xxx(?![a-z])|adults?[ -]*(only|game|sim|film|content|version)/i;

/* Not "sexual-content": RAWG hangs it on any game with a sex scene in it,
   which is 4,880 games including Halo Infinite, Sekiro, Persona 5 and Red
   Dead Redemption. The filter is for games that are pornography, not for
   games that contain a scene — an M-rating already tells a parent that. */
const SEXUAL_TAG_SLUGS = new Set([
  "nsfw",
  "adult",
  "hentai",
  "erotic",
  "eroge",
  "pornographic",
  /* Not "dating-sim": it is a genre, and RAWG hangs it on anything with
     romance in it. It had Stardew Valley behind the explicit-content filter
     along with a thousand others. */
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
  /* Detail endpoint only — absent from every listing row. */
  developers?: { id: number; name: string; slug: string }[] | null;
  publishers?: { id: number; name: string; slug: string }[] | null;
  website?: string | null;
}

/** The handful RAWG actually emits. Numeric ones are handled separately. */
const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&nbsp;": " ",
};

const decodeEntities = (value: string): string =>
  value
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code)),
    )
    .replace(/&[a-z]+;/gi, (entity) => ENTITIES[entity.toLowerCase()] ?? entity);

/** Some RAWG endpoints return the description as HTML. Block tags become the
 *  paragraph breaks they stand for rather than vanishing. */
const stripHtml = (value: string): string =>
  decodeEntities(
    value
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h[1-6]|ul|ol|blockquote)>/gi, "\n\n")
      .replace(/<[^>]*>/g, ""),
  );

/**
 * Tidy without flattening. Runs of spaces collapse; blank lines are the
 * paragraphs the author wrote and are kept.
 */
const tidy = (value: string): string =>
  value
    .replace(/\r\n?/g, "\n")
    // Spaces and tabs only — \s would take the newlines with it.
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

/* A sentence running straight into the next one is a block break that was
   lost before it reached us, not prose: "...the world.We're working". Two
   lowercase letters before the stop, so "e.g.Something" and "3.5" are safe. */
const spaceRunOnSentences = (value: string): string =>
  value.replace(/([a-z0-9]{2}[.!?])([A-Z])/g, "$1 $2");

/**
 * The description as it should read. RAWG's plain text usually carries the
 * paragraphs; where it has been flattened upstream, the HTML sometimes still
 * has the block tags, so that is worth preferring.
 */
export const toDescription = (game: RawgGame): string => {
  const raw = game.description_raw ?? "";
  const html = game.description ?? "";

  const fromRaw = tidy(raw);
  const fromHtml = tidy(stripHtml(html));

  const chosen =
    !fromRaw.includes("\n") && fromHtml.includes("\n") ? fromHtml : fromRaw;

  return spaceRunOnSentences(chosen || fromHtml);
};

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
  const tagSlugs = (game.tags ?? []).map((t) => t.slug);
  const { platformSlugs, systemSlugs } = toPlatforms(game);

  return {
    externalId: game.id,
    slug: game.slug,
    title: game.name,
    description: toDescription(game),
    coverUrl: game.background_image ?? null,
    // Filled in by the provider's detail fetch, which has the store links.
    boxArtUrl: null,
    // RAWG returns an empty string rather than null for unreleased titles
    releaseDate: game.released || null,
    platformSlugs,
    systemSlugs,
    genres: (game.genres ?? []).map((g) => ({
      slug: g.slug,
      name: g.name,
    })),
    developers: (game.developers ?? []).map((d) => d.name),
    publishers: (game.publishers ?? []).map((p) => p.name),
    // RAWG returns an empty string for a game with no site of its own.
    website: game.website || null,
    esrbRating: game.esrb_rating?.name ?? null,
    contentTags: tagSlugs,
    hasSexualContent:
      !NOT_SEXUAL_TITLES.has(game.name.trim().toLowerCase()) &&
      (SEXUAL_ESRB_SLUGS.has(game.esrb_rating?.slug ?? "") ||
        tagSlugs.some((slug) => SEXUAL_TAG_SLUGS.has(slug)) ||
        SEXUAL_TITLE_PATTERN.test(game.name)),
    metacritic: game.metacritic ?? null,
    rawgRating: game.rating ?? null,
    rawgRatingCount: game.ratings_count ?? null,
    rawgAddedCount: game.added ?? null,
    // RAWG's playtime is whole hours
    playtimeHours: game.playtime ? Number(game.playtime) : null,
  };
};
