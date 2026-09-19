import type { ExternalGame } from "../GamesProvider.js";

/**
 * RAWG's parent platform ids mapped onto PlayRates' platform slugs.
 *
 * Known limitation: RAWG models storefronts separately from platforms, so
 * "PC" cannot be split into Steam vs Game Pass here. Those two slugs stay
 * meaningful on a game *log* — where the user says where they played it — but
 * will not appear on a game's platform list.
 */
const PARENT_PLATFORM_SLUGS: Record<number, string> = {
    1: "other-pc", // PC
    2: "playstation",
    3: "xbox",
    4: "mobile", // iOS
    8: "mobile", // Android
    7: "nintendo-switch", // Nintendo
};

export interface RawgGame {
    id: number;
    slug: string;
    name: string;
    description_raw?: string | null;
    description?: string | null;
    background_image?: string | null;
    released?: string | null;
    esrb_rating?: { id: number; slug: string; name: string } | null;
    rating?: number | null;
    ratings_count?: number | null;
    playtime?: number | null;
    parent_platforms?: { platform: { id: number; slug: string } }[] | null;
}

/** RAWG returns descriptions as HTML in some endpoints. */
const stripHtml = (value: string): string =>
    value
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

const ADULT_ESRB_SLUGS = new Set(["adults-only", "mature"]);

export const toExternalGame = (game: RawgGame): ExternalGame => {
    const description = game.description_raw ?? game.description ?? "";

    const platformSlugs = [
        ...new Set(
            (game.parent_platforms ?? [])
                .map((p) => PARENT_PLATFORM_SLUGS[p.platform.id])
                .filter((slug): slug is string => Boolean(slug))
        ),
    ];

    return {
        externalId: game.id,
        slug: game.slug,
        title: game.name,
        description: stripHtml(description),
        coverUrl: game.background_image ?? null,
        // RAWG sometimes returns an empty string rather than null
        releaseDate: game.released || null,
        platformSlugs,
        isAdult: ADULT_ESRB_SLUGS.has(game.esrb_rating?.slug ?? ""),
        popularity: game.ratings_count ?? null,
        // RAWG's playtime is whole hours
        hoursToBeat: game.playtime ? Number(game.playtime) : null,
        raw: game,
    };
};
