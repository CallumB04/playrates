import {
  SITE_DESCRIPTION,
  SITE_ORIGIN,
  gameDescription,
  gamePageName,
  pageTitle,
  profileDescription,
  toPlainText,
  truncateDescription,
  type RichTextDoc,
} from "@playrates/shared";
import type { Repositories } from "../../repositories.js";
import { DEFAULT_IMAGE, type HeadMeta } from "./head.js";

/** Below this many, an average is one person's opinion, and a star rating
 *  in search results would say otherwise. */
const MIN_RATINGS_FOR_STARS = 3;

type Repos = Pick<Repositories, "games" | "platforms" | "profiles" | "community">;

/**
 * What the server says about a page before the app loads: enough for a
 * link preview and a search result. Read straight from the repositories,
 * never through a service, so rendering a page can't set off an IGDB call.
 *
 * Each returns null when there is nothing at that address.
 */
export const createPagesService = (repos: Repos) => ({
  async game(id: number): Promise<HeadMeta | null> {
    const [row, platforms] = await Promise.all([
      repos.games.findById(id),
      repos.platforms.list(),
    ]);
    if (!row) return null;

    const names = (row.game_platforms ?? []).map(
      ({ platform_slug }) =>
        platforms.find((p) => p.slug === platform_slug)?.display_name ??
        platform_slug,
    );
    const avgRating = row.avg_rating === null ? null : Number(row.avg_rating);
    const input = {
      title: row.title,
      releaseDate: row.release_date,
      platforms: names,
      avgRating,
      ratingCount: row.rating_count,
    };
    const path = `/game/${row.id}`;
    // Landscape art fills a wide preview; box art is a fallback.
    const image = row.cover_url ?? row.box_art_url;

    return {
      title: pageTitle(gamePageName(input)),
      description: gameDescription(input),
      path,
      // Adult games show nothing in a preview and stay out of search.
      image: row.has_sexual_content ? DEFAULT_IMAGE : (image ?? DEFAULT_IMAGE),
      card: image && !row.has_sexual_content ? "summary_large_image" : "summary",
      noindex: row.has_sexual_content,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "VideoGame",
        name: row.title,
        url: `${SITE_ORIGIN}${path}`,
        ...(image ? { image } : {}),
        ...(row.release_date ? { datePublished: row.release_date } : {}),
        ...(names.length > 0 ? { gamePlatform: names } : {}),
        ...(avgRating !== null && row.rating_count >= MIN_RATINGS_FOR_STARS
          ? {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: avgRating.toFixed(1),
                bestRating: 10,
                worstRating: 0.5,
                ratingCount: row.rating_count,
              },
            }
          : {}),
      },
    };
  },

  async profile(username: string): Promise<HeadMeta | null> {
    const row = await repos.profiles.findByUsername(username);
    if (!row) return null;
    return {
      title: pageTitle(row.username),
      description: profileDescription(row.username, row.bio),
      path: `/user/${row.username}`,
      image: row.avatar_url ?? DEFAULT_IMAGE,
      card: "summary",
      type: "profile",
      noindex: row.hide_from_search,
    };
  },

  async thread(id: number): Promise<HeadMeta | null> {
    const thread = await repos.community.findThread(id);
    if (!thread) return null;
    const opening = (await repos.community.listMessages(id)).find(
      (m) => m.is_opening,
    );
    const text = opening?.body
      ? toPlainText(opening.body as RichTextDoc, { hideSpoilers: true })
      : "";
    return {
      title: pageTitle(thread.title),
      description: text ? truncateDescription(text) : SITE_DESCRIPTION,
      path: `/community/thread/${thread.id}`,
      image: DEFAULT_IMAGE,
      card: "summary_large_image",
      type: "article",
    };
  },
});

export type PagesService = ReturnType<typeof createPagesService>;
