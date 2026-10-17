import {
  brand,
  brandWith,
  button,
  critic,
  ctaSlide,
  developer,
  escape,
  headline,
  metaLine,
  meter,
  page,
  swipe,
  year,
} from "../slides.mjs";

/**
 * The subject's art, sharp, with the year or name set solid across its
 * lower edge, then the claim in quotes under a plain "Hot take" label.
 */
const hookSlide = ({ mark, art, take, kicker, label }) => `
<section class="slide take-hook" data-name="hook">
    <div class="take-art bleed" style="background-image:url('${art.game.banner}');background-position:${art.game.bannerPosition}"></div>
    ${brand}
    <div class="take-copy">
        <div class="take-mark fit">${escape(mark)}</div>
        <span class="take-label">${escape(label ?? "Hot take")}</span>
        <h1 class="take-claim">${headline(take)}</h1>
        ${kicker ? `<p>${headline(kicker)}</p>` : ""}
        ${swipe}
    </div>
</section>`;

const gameSlide = (game, rank, total, showCriticScore) => `
<section class="slide take-game" data-name="rank-${String(rank).padStart(2, "0")}">
    <div class="take-hero bleed" style="background-image:url('${game.banner}');background-position:${game.bannerPosition}"></div>
    ${brandWith(`${rank}/${total}`)}
    <div class="take-body">
        <div class="take-numeral${rank === 1 ? " top" : ""}">${rank}</div>
        <h3>${escape(game.title)}</h3>
        ${metaLine([year(game), developer(game), showCriticScore && game.criticScore !== null && critic(game.criticScore)])}
        <blockquote class="take-quote" data-max-lines="3">${escape(game.blurb)}</blockquote>
        <div class="take-foot">${meter()}<span class="url">playrates.app</span></div>
    </div>
</section>`;

/** What the take left out, and an invitation to disagree with a rating. */
const outroSlide = ({ title, body, games, rate }) => `
<section class="slide take-outro" data-name="outro">
    ${brand}
    <h2>${headline(title)}</h2>
    <div class="fan fan-${games.length}">${games
      .map(({ game }) => `<img src="${game.cover}" alt="">`)
      .join("")}</div>
    <p>${headline(body)}</p>
    <div class="take-card">
        <img src="${rate.game.cover}" alt="">
        <div>
            <div class="take-card-title">${escape(rate.title ?? rate.game.title)}</div>
            ${meter(rate.rating, rate.label)}
        </div>
    </div>
    ${button(`Rate ${games.length === 1 ? "it" : "them"} at playrates.app`)}
</section>`;

/**
 * A ranked list sold on a claim people will argue with. The hook states it,
 * each game makes the case in a line, and the last slide shows what was left
 * out and asks for the viewer's own rating.
 */
export const renderHotTake = (post) => {
  const total = post.games.length;
  const ranked = post.games.map(({ game }, i) => ({ game, rank: i + 1 }));
  return page([
    hookSlide(post.hook),
    ctaSlide(post.cta),
    ...[...ranked]
      .reverse()
      .map(({ game, rank }) =>
        gameSlide(game, rank, total, post.showCriticScore),
      ),
    outroSlide(post.outro),
  ]);
};
