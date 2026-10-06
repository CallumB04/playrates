import type { AltCover, ExternalGame } from "../GamesProvider.js";
import { isSexualContent } from "../explicitContent.js";
import { IGDB_PC, IGDB_SYSTEMS, SYSTEM_FAMILY } from "./igdb.platforms.js";

/** A game as the fields in igdb.provider.ts ask for it. Every expanded
 *  field is optional: IGDB leaves out what it doesn't have. */
export interface IgdbGame {
  id: number;
  name: string;
  slug: string;
  summary?: string;
  storyline?: string;
  /** Unix seconds. */
  first_release_date?: number;
  cover?: { image_id: string };
  artworks?: { image_id: string }[];
  screenshots?: { image_id: string }[];
  platforms?: number[];
  genres?: { slug: string; name: string }[];
  themes?: number[];
  involved_companies?: {
    company?: { name: string };
    developer?: boolean;
    publisher?: boolean;
  }[];
  websites?: { url: string; type?: number }[];
  external_games?: { external_game_source?: number; uid?: string }[];
  age_ratings?: {
    organization?: number;
    rating_category?: { rating?: string };
  }[];
  /** Professional reviews, averaged. 0-100. */
  aggregated_rating?: number;
  /** Everyone who has rated it, critics and players. */
  total_rating_count?: number;
  similar_games?: number[];
  collections?: { id: number; name: string }[];
  franchises?: { id: number; name: string }[];
  game_localizations?: {
    cover?: { image_id: string };
    region?: { name: string };
  }[];
}

/** How many other covers a game keeps, so a page shows a few, not forty. */
export const MAX_ALT_COVERS = 4;

const IMAGE_BASE = "https://images.igdb.com/igdb/image/upload";

export const igdbImage = (imageId: string, size: string): string =>
  `${IMAGE_BASE}/t_${size}/${imageId}.jpg`;

const EROTIC_THEME = 42;
const OFFICIAL_WEBSITE = 1;
const STEAM_SOURCE = 1;
const ESRB = 1;

/** ESRB's short forms, as the game page has always written them. */
const ESRB_WORDS: Record<string, string> = {
  RP: "Rating Pending",
  EC: "Early Childhood",
  E: "Everyone",
  E10: "Everyone 10+",
  T: "Teen",
  M: "Mature",
  AO: "Adults Only",
};

const esrbRating = (game: IgdbGame): string | null => {
  const rating = game.age_ratings?.find((r) => r.organization === ESRB)
    ?.rating_category?.rating;
  if (!rating) return null;
  return ESRB_WORDS[rating.toUpperCase().replace(/\+$/, "")] ?? null;
};

/** A PC game sold on Steam shows under Steam; any other is just PC. */
const pcSystem = (game: IgdbGame): string =>
  game.external_games?.some((e) => e.external_game_source === STEAM_SOURCE)
    ? "steam"
    : "other-pc";

const unique = <T>(items: T[]): T[] => [...new Set(items)];

const systems = (game: IgdbGame): string[] =>
  unique(
    (game.platforms ?? []).flatMap((id) => {
      if (id === IGDB_PC) return [pcSystem(game)];
      const slug = IGDB_SYSTEMS[id];
      return slug ? [slug] : [];
    }),
  );

const releaseDate = (seconds: number | undefined): string | null =>
  seconds === undefined
    ? null
    : new Date(seconds * 1000).toISOString().slice(0, 10);

const companies = (
  game: IgdbGame,
  role: "developer" | "publisher",
): string[] =>
  unique(
    (game.involved_companies ?? [])
      .filter((c) => c[role] && c.company?.name)
      .map((c) => c.company!.name),
  );

/**
 * The series to group a game with. IGDB's collections are the tighter
 * grouping (the numbered games); a franchise is the fallback for a game in
 * none. Franchise ids are stored negative: the two are numbered separately,
 * and a collection and a franchise sharing an id would merge two series.
 */
const series = (game: IgdbGame): ExternalGame["series"] => {
  const collection = game.collections?.[0];
  if (collection) return { id: collection.id, name: collection.name };
  const franchise = game.franchises?.[0];
  return franchise ? { id: -franchise.id, name: franchise.name } : null;
};

/** Edition covers first, then regional ones, never the main cover twice. */
const altCovers = (game: IgdbGame, editions: AltCover[]): AltCover[] => {
  const regional = (game.game_localizations ?? []).flatMap((l) =>
    l.cover?.image_id
      ? [{ imageId: l.cover.image_id, label: l.region?.name ?? "Regional" }]
      : [],
  );
  const seen = new Set([game.cover?.image_id]);
  return [...editions, ...regional]
    .filter((c) => !seen.has(c.imageId) && seen.add(c.imageId))
    .slice(0, MAX_ALT_COVERS);
};

export const toExternalGame = (
  game: IgdbGame,
  /** Covers of the game's editions, which IGDB keeps as games of their own. */
  editions: AltCover[] = [],
): ExternalGame => {
  const systemSlugs = systems(game);
  const cover = game.cover ? igdbImage(game.cover.image_id, "cover_big_2x") : null;
  // A wide picture for link previews and the game page's backdrop.
  const wide = game.artworks?.[0] ?? game.screenshots?.[0];

  return {
    externalId: game.id,
    slug: game.slug,
    title: game.name,
    description: (game.summary || game.storyline || "").trim(),
    coverUrl: wide ? igdbImage(wide.image_id, "1080p") : cover,
    boxArtUrl: cover,
    releaseDate: releaseDate(game.first_release_date),
    platformSlugs: unique(systemSlugs.map((s) => SYSTEM_FAMILY[s]!)),
    systemSlugs,
    genres: (game.genres ?? []).map(({ slug, name }) => ({ slug, name })),
    developers: companies(game, "developer"),
    publishers: companies(game, "publisher"),
    website:
      game.websites?.find((w) => w.type === OFFICIAL_WEBSITE)?.url ?? null,
    esrbRating: esrbRating(game),
    hasSexualContent: isSexualContent(
      game.name,
      (game.themes ?? []).includes(EROTIC_THEME),
    ),
    criticScore:
      game.aggregated_rating === undefined
        ? null
        : Math.round(game.aggregated_rating),
    igdbRatingCount: game.total_rating_count ?? null,
    similarIds: game.similar_games ?? [],
    series: series(game),
    altCovers: altCovers(game, editions),
  };
};
