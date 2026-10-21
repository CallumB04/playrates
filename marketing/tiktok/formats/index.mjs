import { renderGuess } from "./guess.mjs";
import { renderGuessYear } from "./guessyear.mjs";
import { renderHigherLower } from "./higherlower.mjs";
import { renderHotTake } from "./hottake.mjs";
import { renderPairs } from "./pairs.mjs";
import { renderRanked } from "./ranked.mjs";
import { renderTiers } from "./tiers.mjs";
import { renderTips } from "./tips.mjs";
import { renderUpcoming } from "./upcoming.mjs";
import { renderWhichFirst } from "./whichfirst.mjs";

/**
 * Every format a post can take, keyed by the post's `format`. A post without
 * one is ranked, as every post was before there were others. `npm run
 * tiktok:next` suggests from these, keeping video and photo near half and
 * half, so a format added here joins the rotation.
 */
export const FORMATS = {
  ranked: {
    render: renderRanked,
    summary: "Top 10, counted down to #1",
  },
  hottake: {
    render: renderHotTake,
    summary: "A claim people will argue with, made in ten games",
  },
  pairs: {
    render: renderPairs,
    summary: "If you liked this, play that, six times",
  },
  tiers: {
    render: renderTiers,
    summary: "A series or genre sorted into S, A, B and C",
  },
  tips: {
    render: renderTips,
    demo: true,
    summary: "Tips, habits or mistakes the viewer takes away, one a slide",
  },
  upcoming: {
    render: renderUpcoming,
    summary: "Releases still to come, in date order, for the wishlist",
  },
  guess: {
    render: renderGuess,
    video: true,
    summary: "Video: name the game from a screenshot as it sharpens",
  },
  higherlower: {
    render: renderHigherLower,
    video: true,
    summary: "Video: which of two games got the higher critic score",
  },
  guessyear: {
    render: renderGuessYear,
    video: true,
    summary: "Video: guess the year a game came out",
  },
  whichfirst: {
    render: renderWhichFirst,
    video: true,
    summary: "Video: which of two games came out first",
  },
};

export const formatOf = (post) => post.format ?? "ranked";

export const renderPost = (post) => {
  const format = FORMATS[formatOf(post)];
  if (!format) {
    throw new Error(
      `unknown format "${post.format}"; one of ${Object.keys(FORMATS).join(", ")}`,
    );
  }
  return format.render(post);
};
