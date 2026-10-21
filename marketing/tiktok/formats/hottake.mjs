import {
  brand,
  critic,
  developer,
  escape,
  featureSlide,
  headline,
  metaLine,
  page,
  signoff,
  swipe,
  withCta,
  year,
} from "../slides.mjs";

/**
 * The subject's art, sharp, with the year or name set solid across its
 * lower edge, then the claim. The label is a word in ember, nothing more: a
 * rule and a quote mark around it read as a template.
 */
const hookSlide = ({ mark, art, take, kicker, label }) => `
<section class="slide take-hook" data-name="hook">
    <div class="take-art bleed" style="background-image:url('${art.game.banner}');background-position:${art.game.bannerPosition}"></div>
    ${brand}
    <div class="take-copy">
        <div class="take-mark fit">${escape(mark)}</div>
        ${label === "" ? "" : `<span class="take-label">${escape(label ?? "Hot take")}</span>`}
        <h1 class="take-claim">${headline(take)}</h1>
        ${kicker ? `<p>${headline(kicker)}</p>` : ""}
        ${swipe}
    </div>
</section>`;

const gameSlide = (game, rank, showCriticScore) =>
  featureSlide({
    name: `rank-${String(rank).padStart(2, "0")}`,
    art: game.banner,
    position: game.bannerPosition,
    rank,
    title: escape(game.title),
    caption: metaLine([
      year(game),
      developer(game),
      showCriticScore && game.criticScore !== null && critic(game.criticScore),
    ]),
    body: escape(game.blurb),
  });

/** What the take left out, and a question for the comments. */
const outroSlide = ({ title, body, games }) => `
<section class="slide take-outro" data-name="outro">
    ${brand}
    <h2>${headline(title)}</h2>
    <div class="fan fan-${games.length}">${games
      .map(({ game }) => `<img src="${game.cover}" alt="">`)
      .join("")}</div>
    <p>${headline(body)}</p>
    ${signoff("Rate them at playrates.app")}
</section>`;

/**
 * A ranked list sold on a claim people will argue with. The hook states it,
 * each game makes the case in a line, the sign-up slide comes in before the
 * top 3, and the last slide shows what was left out.
 */
export const renderHotTake = (post) => {
  const ranked = post.games.map(({ game }, i) => ({ game, rank: i + 1 }));
  return page([
    hookSlide(post.hook),
    ...withCta(
      [...ranked]
        .reverse()
        .map(({ game, rank }) => gameSlide(game, rank, post.showCriticScore)),
      post.cta,
      3,
    ),
    outroSlide(post.outro),
  ]);
};
