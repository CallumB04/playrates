import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_ORIGIN,
  GAMING_25_CENTRE,
  GAMING_25_SIZE,
  gameDescription,
  gaming25ImageQueryVersion,
  gaming25Label,
  gamePageName,
  pageTitle,
  profileDescription,
  toPlainText,
  truncateDescription,
  type RichTextDoc,
  HUB_FIRST_YEAR,
  hubFilters,
  hubPath,
  hubWords,
  isHubYear,
  type Hub,
  gameTrail,
  gaming25Trail,
  hubTrail,
  listTrail,
  reviewTrail,
  threadTrail,
} from "@playrates/shared";
import type { Repositories } from "../../repositories.js";
import type { GenreRow } from "../../types/database.types.js";
import type { ReviewRowJoined } from "../reviews/reviews.repository.js";
import { memoFor } from "../../lib/memo.js";
import { inGridOrder } from "../gaming25/gaming25.mapper.js";
import { toProfileVisibility } from "../profiles/profiles.mapper.js";
import { excerpt, toParagraphs, type PageBody } from "./body.js";
import {
  DEFAULT_IMAGE,
  WIDE_IMAGE_SIZE,
  breadcrumbList,
  type HeadMeta,
} from "./head.js";

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
  | "gaming25"
>;

/** What a hub page names in its HTML. */
const HUB_GAMES_IN_BODY = 24;

/** A hub as its address asks for it, before its names are looked up. */
export type HubRequest =
  | { kind: "year"; year: number }
  | { kind: "genre" | "platform"; slug: string }
  | { kind: "upcoming" }
  | { kind: "similar"; gameId: number };

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
const organisations = (names: string[]) =>
  names.map((name) => ({ "@type": "Organization", name }));

export const createPagesService = (repos: Repos) => {
  // Every game page names its platforms and genres, and they hardly change.
  const platformList = memoFor(10 * 60_000, () => repos.platforms.list());
  const genreList = memoFor(10 * 60_000, () => repos.genres.list());

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
        platformList(),
        genreList(),
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
          "@graph": [
            {
              "@type": "VideoGame",
              name: row.title,
              url: `${SITE_ORIGIN}${path}`,
              ...(image ? { image } : {}),
              ...(row.description
                ? { description: truncateDescription(row.description, 500) }
                : {}),
              ...(row.release_date ? { datePublished: row.release_date } : {}),
              ...(names.length > 0 ? { gamePlatform: names } : {}),
              ...((row.game_genres ?? []).length > 0
                ? {
                    genre: (row.game_genres ?? []).map(
                      ({ genre_slug }) =>
                        genres.find((g) => g.slug === genre_slug)?.name ??
                        genre_slug,
                    ),
                  }
                : {}),
              ...(row.developers.length > 0
                ? { author: organisations(row.developers) }
                : {}),
              ...(row.publishers.length > 0
                ? { publisher: organisations(row.publishers) }
                : {}),
              ...(avgRating !== null &&
              row.rating_count >= MIN_RATINGS_FOR_STARS
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
            breadcrumbList(gameTrail(row)),
          ],
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
        // Hidden from search, or a profile only some may see past: either
        // way not one to list.
        noindex:
          row.hide_from_search ||
          toProfileVisibility(row.profile_visibility) !== "everyone",
        // Hidden from search means hidden from this too.
        body: row.hide_from_search ? undefined : await profileBody(row),
        // Only for a profile that's listed: the rest say nothing more.
        jsonLd:
          row.hide_from_search ||
          toProfileVisibility(row.profile_visibility) !== "everyone"
            ? undefined
            : {
                "@context": "https://schema.org",
                "@type": "ProfilePage",
                dateCreated: row.created_at,
                mainEntity: {
                  "@type": "Person",
                  name: row.username,
                  alternateName: row.username,
                  url: `${SITE_ORIGIN}/user/${row.username}`,
                  ...(row.avatar_url ? { image: row.avatar_url } : {}),
                  ...(row.bio
                    ? { description: truncateDescription(row.bio) }
                    : {}),
                },
              },
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
      // The games in the list's order, adult ones left out as everywhere.
      const items = (await repos.lists.items(row.id)).sort(
        (a, b) => a.position - b.position,
      );
      const games = new Map(
        (await repos.games.findByIds(items.map((i) => i.game_id)))
          .filter((g) => !g.has_sexual_content)
          .map((g) => [g.id, g]),
      );
      const listed = items.flatMap((i) => games.get(i.game_id) ?? []);
      const body: PageBody = {
        heading: row.name,
        lead: `${row.ranked ? "A ranked list" : "A list"} by ${row.owner_username}, ${row.game_count} ${row.game_count === 1 ? "game" : "games"}.`,
        text: toParagraphs(row.description ?? ""),
        sections: [
          {
            heading: "The games",
            items: listed.map((g, i) => ({
              title: row.ranked ? `${i + 1}. ${g.title}` : g.title,
              meta: g.release_date ? g.release_date.slice(0, 4) : undefined,
            })),
          },
        ],
        links: [
          {
            href: `/user/${row.owner_username}`,
            label: `${row.owner_username}'s profile`,
          },
        ],
      };

      return {
        body,
        breadcrumbs: listTrail(row.owner_username, row),
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: row.name,
          ...(row.description ? { description: row.description } : {}),
          itemListOrder: row.ranked
            ? "https://schema.org/ItemListOrderAscending"
            : "https://schema.org/ItemListUnordered",
          numberOfItems: listed.length,
          itemListElement: listed.map((g, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: g.title,
            url: `${SITE_ORIGIN}/game/${g.id}`,
          })),
        },
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

    /** Previews as its own picture where anyone may see it; behind a
     *  private or friends-only profile, as nothing in particular. */
    async gaming25(username: string): Promise<HeadMeta | null> {
      const profile = await repos.profiles.findByUsername(username);
      if (!profile) return null;
      const path = `/user/${profile.username}/gaming-25`;
      const card =
        toProfileVisibility(profile.profile_visibility) === "everyone"
          ? await repos.gaming25.card(profile.id)
          : null;
      if (!card) {
        return {
          title: pageTitle("A Gaming 25"),
          description: SITE_DESCRIPTION,
          path,
          image: DEFAULT_IMAGE,
          card: "summary",
          noindex: true,
        };
      }

      // The centre first, then the rest in grid order, adult games left out.
      const picks = inGridOrder(await repos.gaming25.picks(profile.id));
      const games = new Map(
        (await repos.games.findByIds([...new Set(picks.map((p) => p.gameId))]))
          .filter((row) => !row.has_sexual_content)
          .map((row) => [row.id, row.title]),
      );
      const named = picks
        .filter((p) => games.has(p.gameId))
        .sort(
          (a, b) =>
            Number(b.category === GAMING_25_CENTRE) -
            Number(a.category === GAMING_25_CENTRE),
        );
      const shown = named
        .slice(0, 3)
        .map((p) => `${gaming25Label(p.category)}: ${games.get(p.gameId)}`);
      const more = named.length - shown.length;
      const description =
        shown.length === 0
          ? `${profile.username}'s 25 games, one for each category, on PlayRates.`
          : `${shown.join(" · ")}${more > 0 ? `, and ${more} more` : ""}. ${named.length} of ${GAMING_25_SIZE} picked on PlayRates.`;

      const body: PageBody = {
        heading: `${profile.username}'s Gaming 25`,
        lead: `${named.length} of ${GAMING_25_SIZE} picked, one game for each category.`,
        sections: [
          {
            heading: "The picks",
            items: named.map((p) => ({
              title: games.get(p.gameId)!,
              meta: gaming25Label(p.category),
            })),
          },
        ],
        links: [
          {
            href: `/user/${profile.username}`,
            label: `${profile.username}'s profile`,
          },
        ],
      };

      return {
        body,
        breadcrumbs: gaming25Trail(profile.username),
        title: pageTitle(`${profile.username}'s Gaming 25`),
        description: truncateDescription(description),
        path,
        image: `${SITE_ORIGIN}/api/v1/gaming-25/${encodeURIComponent(profile.username)}/image.png?layout=wide&v=${gaming25ImageQueryVersion(card.updated_at, profile.card_theme ?? "default")}`,
        imageSize: WIDE_IMAGE_SIZE,
        card: "summary_large_image",
        type: "article",
      };
    },

    async thread(id: number): Promise<HeadMeta | null> {
      const thread = await repos.community.findThread(id);
      if (!thread) return null;
      const [messages, game] = await Promise.all([
        repos.community.listMessages(id),
        thread.game_id ? repos.games.findById(thread.game_id) : null,
      ]);
      // The game's own art, as its page shows; nothing from an adult game.
      const art = thread.game_has_sexual_content
        ? null
        : (game?.cover_url ?? game?.box_art_url ?? null);
      const opening = messages.find((m) => m.is_opening);
      const text = opening?.body
        ? toPlainText(opening.body as RichTextDoc, { hideSpoilers: true })
        : "";
      return {
        title: pageTitle(thread.title),
        description: text ? truncateDescription(text) : SITE_DESCRIPTION,
        path: `/community/thread/${thread.id}`,
        image: art ?? DEFAULT_IMAGE,
        card: "summary_large_image",
        type: "article",
        // As with the game itself, a thread about an adult game says no more
        // and asks not to be listed.
        noindex: thread.game_has_sexual_content,
        breadcrumbs: threadTrail(thread),
        jsonLd: thread.game_has_sexual_content
          ? undefined
          : {
              "@context": "https://schema.org",
              "@type": "DiscussionForumPosting",
              headline: thread.title,
              url: `${SITE_ORIGIN}/community/thread/${thread.id}`,
              datePublished: thread.created_at,
              ...(text ? { text: truncateDescription(text, 500) } : {}),
              ...(thread.author_username
                ? {
                    author: {
                      "@type": "Person",
                      name: thread.author_username,
                      url: `${SITE_ORIGIN}/user/${thread.author_username}`,
                    },
                  }
                : {}),
              commentCount: messages.filter(
                (m) => !m.is_opening && !m.deleted_at,
              ).length,
              ...(thread.game_title && thread.game_id
                ? {
                    about: {
                      "@type": "VideoGame",
                      name: thread.game_title,
                      url: `${SITE_ORIGIN}/game/${thread.game_id}`,
                    },
                  }
                : {}),
            },
        body: thread.game_has_sexual_content
          ? undefined
          : threadBody(thread, messages),
      };
    },

    /** A review on its own page. A private one isn't a page at all; one
     *  of an adult game, or by someone whose profile isn't open to all,
     *  asks not to be listed and names no one. */
    async review(id: number): Promise<HeadMeta | null> {
      const row = await repos.reviews.findById(id);
      if (!row || !row.is_public) return null;
      const hidden =
        row.game_has_sexual_content ||
        (row.author_profile_visibility ?? "everyone") !== "everyone";
      const author = hidden ? null : row.author_username;
      const game = row.game_title;
      const heading = author
        ? `${author}’s review of ${game}`
        : `A review of ${game}`;
      // A spoiler is kept off the page and out of the preview, as the app
      // keeps it behind a tap.
      const text = row.contains_spoilers ? "" : row.body.trim();
      const rating = row.rating === null ? null : Number(row.rating);
      return {
        title: pageTitle(heading),
        description: text
          ? truncateDescription(text)
          : `${heading}. It contains spoilers.`,
        path: `/review/${row.id}`,
        image: row.game_has_sexual_content
          ? DEFAULT_IMAGE
          : (row.game_cover_url ?? DEFAULT_IMAGE),
        card: "summary_large_image",
        type: "article",
        noindex: hidden,
        breadcrumbs: reviewTrail({
          id: row.id,
          game: { id: row.game_id, title: game },
          author,
        }),
        jsonLd: hidden
          ? undefined
          : {
              "@context": "https://schema.org",
              "@type": "Review",
              url: `${SITE_ORIGIN}/review/${row.id}`,
              datePublished: row.created_at,
              itemReviewed: {
                "@type": "VideoGame",
                name: game,
                url: `${SITE_ORIGIN}/game/${row.game_id}`,
              },
              ...(author
                ? {
                    author: {
                      "@type": "Person",
                      name: author,
                      url: `${SITE_ORIGIN}/user/${author}`,
                    },
                  }
                : {}),
              ...(text ? { reviewBody: truncateDescription(text, 2000) } : {}),
              ...(rating !== null
                ? {
                    reviewRating: {
                      "@type": "Rating",
                      ratingValue: rating,
                      bestRating: 10,
                      worstRating: 0,
                    },
                  }
                : {}),
            },
        body: hidden
          ? undefined
          : {
              heading,
              lead: [
                rating !== null ? `Rated ${rating}/10,` : null,
                `written ${formatDay(row.created_at)}.`,
              ]
                .filter(Boolean)
                .join(" "),
              text: text ? toParagraphs(text) : ["It contains spoilers."],
              links: [
                { href: `/game/${row.game_id}`, label: `More about ${game}` },
              ],
            },
      };
    },

    /** A page of games chosen one way. Null for a genre, platform, year
     *  or game the site doesn't have. */
    async hub(asked: HubRequest): Promise<HeadMeta | null> {
      let hub: Hub;
      let rows: { id: number; title: string; release_date: string | null }[];
      if (asked.kind === "similar") {
        const game = await repos.games.findById(asked.gameId);
        if (!game || game.has_sexual_content) return null;
        hub = { kind: "similar", gameId: game.id, title: game.title };
        rows = await repos.games.listByIgdbIds(
          game.similar_igdb_ids ?? [],
          false,
        );
      } else {
        let slice: Exclude<Hub, { kind: "similar" }>;
        if (asked.kind === "year") {
          if (!isHubYear(asked.year)) return null;
          slice = asked;
        } else if (asked.kind === "upcoming") {
          slice = asked;
        } else {
          const known =
            asked.kind === "genre"
              ? (await genreList()).find((g) => g.slug === asked.slug)?.name
              : (await platformList()).find((p) => p.slug === asked.slug)
                  ?.display_name;
          if (!known) return null;
          slice = { kind: asked.kind, slug: asked.slug, name: known };
        }
        hub = slice;
        const filters = hubFilters(slice);
        ({ rows } = await repos.games.list(
          {
            page: 1,
            limit: HUB_GAMES_IN_BODY,
            excludeLogged: false,
            count: false,
            ...filters,
          },
          0,
          HUB_GAMES_IN_BODY - 1,
          undefined,
          false,
        ));
      }

      const words = hubWords(hub);
      const path = hubPath(hub);
      return {
        title: pageTitle(words.title),
        description: words.description,
        path,
        image: DEFAULT_IMAGE,
        card: "summary",
        // A game with nothing like it is a page with nothing on it.
        noindex: rows.length === 0,
        breadcrumbs: hubTrail(hub),
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: words.heading,
          itemListElement: rows.map((g, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: g.title,
            url: `${SITE_ORIGIN}/game/${g.id}`,
          })),
        },
        body: {
          heading: words.heading,
          lead: words.lead,
          sections: [
            {
              heading: "The games",
              items: rows.map((g) => ({
                title: g.title,
                meta: g.release_date ? g.release_date.slice(0, 10) : undefined,
              })),
            },
          ],
          links: [{ href: "/library", label: "Browse the library" }],
        },
      };
    },

    /** Every hub worth a search engine's visit: each year's best, each
     *  genre and platform, and what's coming. */
    async hubPaths(): Promise<{ path: string }[]> {
      const [genres, platforms] = await Promise.all([
        genreList(),
        platformList(),
      ]);
      const thisYear = new Date().getUTCFullYear();
      const years = Array.from(
        { length: thisYear - HUB_FIRST_YEAR + 1 },
        (_, i) => thisYear - i,
      );
      return [
        { kind: "upcoming" } as const,
        ...years.map((year) => ({ kind: "year", year }) as const),
        ...genres.map(
          (g) => ({ kind: "genre", slug: g.slug, name: g.name }) as const,
        ),
        ...platforms.map(
          (p) =>
            ({ kind: "platform", slug: p.slug, name: p.display_name }) as const,
        ),
      ].map((hub) => ({ path: hubPath(hub) }));
    },
  };
};

export type PagesService = ReturnType<typeof createPagesService>;
