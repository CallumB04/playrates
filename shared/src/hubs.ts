/**
 * Pages of games chosen one way: a year's best, a genre, a platform, what's
 * coming, and games like one game. One definition for the page the app
 * draws and the head the server sends, so the two say the same.
 */
import type { GameSort } from "./schemas/game.js";

export type Hub =
  | { kind: "year"; year: number }
  | { kind: "genre"; slug: string; name: string }
  | { kind: "platform"; slug: string; name: string }
  | { kind: "upcoming" }
  | { kind: "similar"; gameId: number; title: string };

/** The first year a best-of page goes back to. */
export const HUB_FIRST_YEAR = 1980;

export const hubPath = (hub: Hub): string => {
  switch (hub.kind) {
    case "year":
      return `/games/best/${hub.year}`;
    case "genre":
      return `/games/genre/${hub.slug}`;
    case "platform":
      return `/games/platform/${hub.slug}`;
    case "upcoming":
      return "/games/upcoming";
    case "similar":
      return `/game/${hub.gameId}/similar`;
  }
};

export interface HubWords {
  /** On the page. */
  heading: string;
  /** Under the heading. */
  lead: string;
  /** The tab and search result, before the site's name. */
  title: string;
  /** The search result's line. */
  description: string;
}

export const hubWords = (hub: Hub): HubWords => {
  switch (hub.kind) {
    case "year":
      return {
        heading: `The best games of ${hub.year}`,
        lead: `Released in ${hub.year}, best reviewed first.`,
        title: `Best games of ${hub.year}`,
        description: `The best reviewed games released in ${hub.year}, with ratings and reviews from PlayRates members.`,
      };
    case "genre":
    case "platform":
      return {
        heading: `${hub.name} games`,
        lead: `The ${hub.name} games logged most on PlayRates.`,
        title: `${hub.name} games`,
        description: `The most logged ${hub.name} games on PlayRates, with ratings and reviews from members.`,
      };
    case "upcoming":
      return {
        heading: "Upcoming games",
        lead: "Still to come, soonest first.",
        title: "Upcoming games",
        description:
          "Games with a release date still to come, soonest first. Add them to your wishlist on PlayRates.",
      };
    case "similar":
      return {
        heading: `Games like ${hub.title}`,
        lead: `If you liked ${hub.title}, these are close to it.`,
        title: `Games like ${hub.title}`,
        description: `Games like ${hub.title}, with ratings and reviews from PlayRates members.`,
      };
  }
};

/** The library filters a hub lists, where it's a slice of the library.
 *  Games like one game come from its related games instead. */
export const hubFilters = (
  hub: Exclude<Hub, { kind: "similar" }>,
): {
  sort: GameSort;
  genre?: string;
  platform?: string;
  releasedAfter?: string;
  releasedBefore?: string;
} => {
  switch (hub.kind) {
    case "year":
      return {
        sort: "critic",
        releasedAfter: `${hub.year}-01-01`,
        releasedBefore: `${hub.year}-12-31`,
      };
    case "genre":
      return { sort: "logged", genre: hub.slug };
    case "platform":
      return { sort: "logged", platform: hub.slug };
    case "upcoming":
      return { sort: "upcoming" };
  }
};

/** Whether a year has a best-of page: from HUB_FIRST_YEAR to this one. */
export const isHubYear = (year: number, now = new Date()): boolean =>
  Number.isInteger(year) &&
  year >= HUB_FIRST_YEAR &&
  year <= now.getUTCFullYear();
