import {
  Lucide,
  brand,
  critic,
  developer,
  escape,
  featureSlide,
  headline,
  icon,
  metaLine,
  page,
  swipe,
  withCta,
  year,
} from "../slides.mjs";

const hookSlide = (hook, games) => `
<section class="slide hook" data-name="hook">
    <div class="wall bleed">${games
      .concat(games)
      .map((game) => `<img src="${game.cover}" alt="">`)
      .join("")}</div>
    <div class="shade bleed"></div>
    ${brand}
    <div class="hook-copy">
        <h1>${headline(hook.title)}</h1>
        ${hook.subtitle ? `<p>${headline(hook.subtitle)}</p>` : ""}
        ${swipe}
    </div>
</section>`;

const gameSlide = (game, rank, { showCriticScore, statIcon }) =>
  featureSlide({
    name: `rank-${String(rank).padStart(2, "0")}`,
    art: game.banner,
    position: game.bannerPosition,
    rank,
    title: escape(game.title),
    caption: metaLine([
      year(game),
      developer(game),
      game.stat &&
        `<span class="stat">${icon(Lucide[statIcon ?? "Clock"])}<span class="mono">${escape(game.stat)}</span></span>`,
      showCriticScore && game.criticScore !== null && critic(game.criticScore),
    ]),
    body: escape(game.blurb),
  });

/**
 * A hook, then one slide per game, with the sign-up slide in front of the
 * last three. `games` arrive ranked, #1 first; a countdown shows them from
 * the bottom up so the reveal is the last swipe.
 */
export const renderRanked = (post) => {
  const ranked = post.games.map(({ game }, i) => ({ game, rank: i + 1 }));
  const countdown = post.order === "countdown";
  const shown = countdown ? [...ranked].reverse() : ranked;
  return page([
    hookSlide(
      post.hook,
      shown.map(({ game }) => game),
    ),
    ...withCta(
      shown.map(({ game, rank }) => gameSlide(game, rank, post)),
      post.cta,
      3,
      countdown ? undefined : "Before the last three",
    ),
  ]);
};
