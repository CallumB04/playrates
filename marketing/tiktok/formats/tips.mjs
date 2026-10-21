import {
  brand,
  escape,
  featureSlide,
  headline,
  page,
  signoff,
  swipe,
  appPlate,
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

/**
 * The one slide that asks anything: the question for the comments, then the
 * product and where to find it. A short post has no room for a sign-up slide
 * of its own in the middle, so it comes here, at the end.
 */
const outroSlide = ({ title, body }, cta) => `
<section class="slide tips-outro" data-name="outro">
    ${brand}
    <div class="cta-copy">
        <h2>${headline(title)}</h2>
        ${body ? `<p>${headline(body)}</p>` : ""}
    </div>
    ${cta ? appPlate(cta) : ""}
    ${signoff(cta?.button ?? "Free at playrates.app")}
</section>`;

/**
 * Something the viewer takes away: tips, habits, mistakes, things nobody
 * tells you. Each tip is a slide in the feature layout, its art from a game
 * it applies to, and the pitch on the last slide, not a slide of its own.
 */
export const renderTips = (post) =>
  page([
    hookSlide(post.hook, post.tips.length),
    ...post.tips.map((tip, i) => tipSlide(tip, i + 1)),
    outroSlide(post.outro, post.cta),
  ]);
