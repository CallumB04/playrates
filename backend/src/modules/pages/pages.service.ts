import {
  SITE_DESCRIPTION,
  SITE_NAME,
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
import type { GenreRow } from "../../types/database.types.js";
import type { ReviewRowJoined } from "../reviews/reviews.repository.js";
import { excerpt, toParagraphs, type PageBody } from "./body.js";
import { DEFAULT_IMAGE, type HeadMeta } from "./head.js";

/** Below this many, an average is one person's opinion, and a star rating
 *  in search results would say otherwise. */
const MIN_RATINGS_FOR_STARS = 3;

type Repos = Pick<
  Repositories,
  | "games"
  | "platforms"
  | "genres"
  | "profiles"
  | "community"
  | "reviews"
  | "lists"
>;

/** How many reviews or replies a page carries in its HTML. */
const REVIEWS_IN_BODY = 5;
const REPLIES_IN_BODY = 20;

const day = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const formatDay = (iso: string) => day.format(new Date(iso));
const formatMonth = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));

const hours = (value: number | null) =>
  value === null ? null : `${Math.round(value * 10) / 10}h`;

/** A review as a reader without the app sees it: a private author has no
 *  name, as everywhere else, and a spoiler keeps its text to itself. */
const reviewItem = (row: ReviewRowJoined, withGame: boolean) => ({
  title: withGame
    ? row.game_title
    : row.author_profile_visibility === "everyone" && row.author_username
      ? row.author_username
      : "A private account",
  meta: [
    row.rating !== null ? `${Number(row.rating).toFixed(1)}/10` : null,
    formatDay(row.created_at),
  ]
    .filter(Boolean)
    .join(" · "),
  text: row.contains_spoilers ? "Contains spoilers." : excerpt(row.body),
});

/**
 * What the server says about a page before the app loads: enough for a
 * link preview and a search result. Read straight from the repositories,
 * never through a service, so rendering a page can't set off an IGDB call.
 *
 * Each returns null when there is nothing at that address.
 */
export const createPagesService = (repos: Repos) => {
  const gameBody = async (
    row: NonNullable<Awaited<ReturnType<Repos["games"]["findById"]>>>,
    input: { avgRating: number | null; ratingCount: number },
    platformNames: string[],
    genres: GenreRow[],
  ): Promise<PageBody> => {
    const [stats, reviews] = await Promise.all([
      repos.games.playratesStats(row.id),
      repos.reviews.listByGame(row.id, undefined, 0, REVIEWS_IN_BODY - 1),
    ]);
    const genreNames = (row.game_genres ?? []).map(
      ({ genre_slug }) =>
        genres.find((g) => g.slug === genre_slug)?.name ?? genre_slug,
    );
    const played = hours(stats.avgHoursPlayed);
    const toBeat = hours(stats.avgHoursToBeat);
    const facts = [
      row.release_date && {
        label: "Released",
        value: formatDay(row.release_date),
      },
      platformNames.length > 0 && {
        label: "Platforms",
        value: platformNames.join(", "),
      },
      genreNames.length > 0 && {
        label: "Genres",
        value: genreNames.join(", "),
      },
      row.developers?.length > 0 && {
        label: "Developer",
        value: row.developers.join(", "),
      },
      input.avgRating !== null &&
        input.ratingCount > 0 && {
          label: "PlayRates rating",
          value: `${input.avgRating.toFixed(1)}/10 from ${input.ratingCount} ${
            input.ratingCount === 1 ? "rating" : "ratings"
          }`,
        },
      row.log_count > 0 && {
        label: "Logged",
        value: `${row.log_count} ${row.log_count === 1 ? "time" : "times"}`,
      },
      played && { label: "Average time played", value: played },
      toBeat && { label: "Average time to beat", value: toBeat },
      row.critic_score !== null && {
        label: "Critic score",
        value: `${Math.round(row.critic_score)}/100`,
      },
    ].filter((f): f is { label: string; value: string } => !!f);

    return {
      heading: row.title,
      lead: `${row.title} on ${SITE_NAME}, the video game tracker: log it, rate it and review it.`,
      facts,
      text: toParagraphs(row.description ?? ""),
      sections: [
        {
          heading: "Recent reviews",
          items: reviews.rows.map((r) => reviewItem(r, false)),
        },
      ],
      links: [
        { href: "/library", label: "Browse the library" },
        { href: "/community", label: "Community threads" },
      ],
    };
  };

  const profileBody = async (
    row: NonNullable<Awaited<ReturnType<Repos["profiles"]["findByUsername"]>>>,
  ): Promise<PageBody> => {
    // Past the card, a private profile shows nothing; neither does this.
    if (row.profile_visibility !== "everyone") {
      return {
        heading: row.username,
        lead: "This profile is private.",
      };
    }
    const reviews = await repos.reviews.listByUser(
      row.id,
      undefined,
      0,
      REVIEWS_IN_BODY - 1,
    );
    return {
      heading: row.username,
      lead: `A ${SITE_NAME} member since ${formatMonth(row.created_at)}.`,
      text: toParagraphs(row.bio ?? ""),
      sections: [
        {
          heading: "Recent reviews",
          items: reviews.rows
            .filter((r) => !r.game_has_sexual_content)
            .map((r) => reviewItem(r, true)),
        },
      ],
    };
  };

  const threadBody = (
    thread: NonNullable<Awaited<ReturnType<Repos["community"]["findThread"]>>>,
    messages: Awaited<ReturnType<Repos["community"]["listMessages"]>>,
  ): PageBody => {
    const plain = (body: unknown) =>
      body ? toPlainText(body as RichTextDoc, { hideSpoilers: true }) : "";
    const opening = messages.find((m) => m.is_opening);
    const replies = messages
      .filter((m) => !m.is_opening && !m.deleted_at && m.body)
      .slice(0, REPLIES_IN_BODY);
    return {
      heading: thread.title,
      lead: [
        thread.game_title ? `A thread about ${thread.game_title}` : "A thread",
        thread.author_username ? `started by ${thread.author_username}` : null,
        `on ${formatDay(thread.created_at)}.`,
      ]
        .filter(Boolean)
        .join(" "),
      text: opening ? toParagraphs(plain(opening.body)) : [],
      sections: [
        {
          heading: "Replies",
          items: replies.map((m) => ({
            title: m.author_username ?? "A deleted account",
            meta: formatDay(m.created_at),
            text: excerpt(plain(m.body)),
          })),
        },
      ],
      links: [{ href: "/community", label: "More community threads" }],
    };
  };

  return {
    async game(id: number): Promise<HeadMeta | null> {
      const [row, platforms, genres] = await Promise.all([
        repos.games.findById(id),
        repos.platforms.list(),
        repos.genres.list(),
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

      // An adult game stays out of search, so it says nothing more here.
      const body = row.has_sexual_content
        ? undefined
        : await gameBody(row, input, names, genres);

      return {
        title: pageTitle(gamePageName(input)),
        description: gameDescription(input),
        path,
        // Adult games show nothing in a preview and stay out of search.
        image: row.has_sexual_content
          ? DEFAULT_IMAGE
          : (image ?? DEFAULT_IMAGE),
        card:
          image && !row.has_sexual_content ? "summary_large_image" : "summary",
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
        body,
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
        // Hidden from search means hidden from this too.
        body: row.hide_from_search ? undefined : await profileBody(row),
      };
    },

    /** A list says what it is only where anyone may see it; one kept to
     *  friends or its owner previews as nothing in particular. */
    async list(username: string, id: number): Promise<HeadMeta | null> {
      const row = await repos.lists.card(id);
      if (!row || row.owner_username !== username) return null;
      const open =
        row.visibility === "everyone" && row.owner_visibility === "everyone";
      if (!open) {
        return {
          title: pageTitle("A list"),
          description: SITE_DESCRIPTION,
          path: `/user/${row.owner_username}/lists/${row.id}`,
          image: DEFAULT_IMAGE,
          card: "summary",
          noindex: true,
        };
      }
      return {
        title: pageTitle(`${row.name}, a list by ${row.owner_username}`),
        description: row.description
          ? truncateDescription(row.description)
          : `${row.game_count} ${row.game_count === 1 ? "game" : "games"} chosen by ${row.owner_username} on PlayRates.`,
        path: `/user/${row.owner_username}/lists/${row.id}`,
        image: DEFAULT_IMAGE,
        card: "summary",
        type: "article",
      };
    },

    async thread(id: number): Promise<HeadMeta | null> {
      const thread = await repos.community.findThread(id);
      if (!thread) return null;
      const messages = await repos.community.listMessages(id);
      const opening = messages.find((m) => m.is_opening);
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
        // As with the game itself, a thread about an adult game says no more.
        body: thread.game_has_sexual_content
          ? undefined
          : threadBody(thread, messages),
      };
    },
  };
};

export type PagesService = ReturnType<typeof createPagesService>;
