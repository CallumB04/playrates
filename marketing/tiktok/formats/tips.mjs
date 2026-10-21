import {
  brand,
  escape,
  featureSlide,
  headline,
  page,
  signoff,
  swipe,
  withCta,
} from "../slides.mjs";

/**
 * The number set huge across the art, then the promise: what the viewer
 * gets for swiping. Same build as the hot take's cover, which is the one
 * that stops people.
 */
const hookSlide = ({ art, title, kicker, label }, count) => `
<section class="slide take-hook" data-name="hook">
    <div class="take-art bleed" style="background-image:url('${art.game.banner}');background-position:${art.game.bannerPosition}"></div>
    ${brand}
    <div class="take-copy">
        <div class="take-mark tips-mark">${count}</div>
        ${label ? `<span class="take-label">${escape(label)}</span>` : ""}
        <h1 class="take-claim">${headline(title)}</h1>
        ${kicker ? `<p>${headline(kicker)}</p>` : ""}
        ${swipe}
    </div>
</section>`;

const tipSlide = ({ title, body, art }, n) =>
  featureSlide({
    name: `tip-${String(n).padStart(2, "0")}`,
    art: art.game.banner,
    position: art.game.bannerPosition,
    rank: n,
    filled: false,
    title,
    caption: `<div class="meta"><span class="dev">${escape(art.game.title)}</span></div>`,
    body,
  });

/** The question for the comments, over a hand of the games the tips came
 *  from, so the last slide isn't a page of words. */
const outroSlide = ({ title, body }, tips) => {
  const covers = [
    ...new Map(tips.map(({ art }) => [art.game.slug, art.game])).values(),
  ].slice(0, 4);
  return `
<section class="slide tips-outro" data-name="outro">
    ${brand}
    <div class="cta-copy">
        <h2>${headline(title)}</h2>
        ${body ? `<p>${headline(body)}</p>` : ""}
    </div>
    <div class="fan fan-${covers.length}">${covers
      .map((game) => `<img src="${game.cover}" alt="">`)
      .join("")}</div>
    ${signoff("Free at playrates.app")}
</section>`;
};

/**
 * Something the viewer takes away: tips, habits, mistakes, things nobody
 * tells you. Each tip is a slide in the feature layout, its art from a game
 * it applies to, with the sign-up slide before the last two.
 */
export const renderTips = (post) =>
  page([
    hookSlide(post.hook, post.tips.length),
    ...withCta(
      post.tips.map((tip, i) => tipSlide(tip, i + 1)),
      post.cta,
      2,
      post.cta?.kicker ?? "Before the last two",
    ),
    outroSlide(post.outro, post.tips),
  ]);
