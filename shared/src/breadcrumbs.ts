/**
 * Where a page sits under the site's top-level ones, as the trail over its
 * title. One definition for the trail the app draws and the BreadcrumbList
 * the server sends, so the two say the same. The last step is the page.
 */
import { hubPath, hubWords, type Hub } from "./hubs.js";

export interface Crumb {
  name: string;
  /** From the site's origin. */
  path: string;
}

const LIBRARY: Crumb = { name: "Library", path: "/library" };
const COMMUNITY: Crumb = { name: "Community", path: "/community" };

const gameCrumb = (game: { id: number; title: string }): Crumb => ({
  name: game.title,
  path: `/game/${game.id}`,
});

export const gameTrail = (game: { id: number; title: string }): Crumb[] => [
  LIBRARY,
  gameCrumb(game),
];

export const listTrail = (
  owner: string,
  list: { id: number; name: string },
): Crumb[] => [
  { name: owner, path: `/user/${owner}` },
  { name: "Lists", path: `/user/${owner}/lists` },
  { name: list.name, path: `/user/${owner}/lists/${list.id}` },
];

export const gaming25Trail = (username: string): Crumb[] => [
  { name: username, path: `/user/${username}` },
  { name: "Gaming 25", path: `/user/${username}/gaming-25` },
];

export const threadTrail = (thread: { id: number; title: string }): Crumb[] => [
  COMMUNITY,
  { name: thread.title, path: `/community/thread/${thread.id}` },
];

/** Started from a game's page, the way back is to that game. */
export const newThreadTrail = (game?: {
  id: number;
  title: string;
}): Crumb[] => [
  game ? gameCrumb(game) : COMMUNITY,
  { name: "Start a thread", path: "/community/new" },
];

/** Without an author when theirs is a profile not open to everyone. */
export const reviewTrail = (review: {
  id: number;
  game: { id: number; title: string };
  author: string | null;
}): Crumb[] => [
  ...gameTrail(review.game),
  {
    name: review.author ? `${review.author}’s review` : "A review",
    path: `/review/${review.id}`,
  },
];

/** A slice of the library sits under it; games like one game, under that
 *  game. */
export const hubTrail = (hub: Hub): Crumb[] => {
  const here = { name: hubWords(hub).title, path: hubPath(hub) };
  return hub.kind === "similar"
    ? [...gameTrail({ id: hub.gameId, title: hub.title }), here]
    : [LIBRARY, here];
};

export const shopTrail = (): Crumb[] => [
  { name: "Your progress", path: "/progress" },
  { name: "Shop", path: "/shop" },
];
