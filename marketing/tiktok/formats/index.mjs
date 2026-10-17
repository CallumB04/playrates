import { renderHotTake } from "./hottake.mjs";
import { renderPairs } from "./pairs.mjs";
import { renderRanked } from "./ranked.mjs";
import { renderTiers } from "./tiers.mjs";
import { renderUpcoming } from "./upcoming.mjs";

/**
 * Every format a post can take, keyed by the post's `format`. A post without
 * one is ranked, as every post was before there were others. `npm run
 * tiktok:next` picks among these, so a format added here joins the rotation.
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
  upcoming: {
    render: renderUpcoming,
    summary: "Releases still to come, in date order, for the wishlist",
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
