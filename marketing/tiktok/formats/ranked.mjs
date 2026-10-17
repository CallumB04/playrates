import {
  Lucide,
  brand,
  footer,
  critic,
  ctaSlide,
  developer,
  escape,
  headline,
  icon,
  metaLine,
  page,
  swipe,
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

const gameSlide = (game, rank, { showCriticScore, statIcon }) => {
  const stat =
    game.stat &&
    `<span class="stat">${icon(Lucide[statIcon ?? "Clock"])}<span class="mono">${escape(game.stat)}</span></span>`;
  const score =
    showCriticScore && game.criticScore !== null && critic(game.criticScore);

  return `
<section class="slide game" data-name="rank-${String(rank).padStart(2, "0")}">
    <div class="hero bleed" style="background-image:url('${game.banner}');background-position:${game.bannerPosition}"></div>
    ${brand}
    <div class="game-body">
        <div class="lead">
            <img class="box" src="${game.cover}" alt="">
            <div class="rank${rank === 1 ? " top" : ""}"><span class="hash">#</span><span class="n">${rank}</span></div>
        </div>
        <h3>${escape(game.title)}</h3>
        ${metaLine([year(game), developer(game), stat, score])}
        <p class="blurb">${escape(game.blurb)}</p>
        ${footer("Played it? Rate it", "played")}
    </div>
</section>`;
};

/**
 * A hook, the sign-up slide, then one slide per game. `games` arrive ranked,
 * #1 first; a countdown shows them from the bottom up so the reveal is the
 * last swipe.
 */
export const renderRanked = (post) => {
  const ranked = post.games.map(({ game }, i) => ({ game, rank: i + 1 }));
  const shown = post.order === "countdown" ? [...ranked].reverse() : ranked;
  return page([
    hookSlide(
      post.hook,
      shown.map(({ game }) => game),
    ),
    ctaSlide(post.cta),
    ...shown.map(({ game, rank }) => gameSlide(game, rank, post)),
  ]);
};
