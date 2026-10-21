import {
  appPlate,
  brand,
  developer,
  escape,
  featureSlide,
  headline,
  metaLine,
  page,
  signoff,
  swipe,
  year,
} from "../slides.mjs";

/** Every game in the post as a wall of covers, the hits beside the picks. */
const hookSlide = ({ title, subtitle }, pairs) => `
<section class="slide hook" data-name="hook">
    <div class="wall bleed">${pairs
      .flatMap(({ from, to }) => [from, to])
      .map(({ game }) => `<img src="${game.cover}" alt="">`)
      .join("")}</div>
    <div class="shade bleed"></div>
    ${brand}
    <div class="hook-copy">
        <h1>${headline(title)}</h1>
        ${subtitle ? `<p>${headline(subtitle)}</p>` : ""}
        ${swipe}
    </div>
</section>`;

/* The game the viewer knows is a line above the title, not a cover of its
   own: a second picture on the slide split the attention. */
const pairSlide = ({ from, to }, i) =>
  featureSlide({
    name: `pair-${i}`,
    art: to.game.banner,
    position: to.game.bannerPosition,
    rank: i,
    filled: false,
    kicker: `If you liked <b>${escape(from.game.title)}</b>`,
    title: escape(to.game.title),
    caption: metaLine([year(to.game), developer(to.game)]),
    body: escape(to.game.blurb),
  });

/**
 * The question for the comments and the pitch together, over the picks'
 * covers. A short post has no sign-up slide in the middle, and a separate
 * one after this read as a second ending.
 */
const outroSlide = ({ title, body }, pairs, cta) => `
<section class="slide pairs-outro" data-name="outro">
    <div class="wall bleed">${pairs
      .concat(pairs)
      .map(({ to }) => `<img src="${to.game.cover}" alt="">`)
      .join("")}</div>
    <div class="shade bleed"></div>
    ${brand}
    <div class="cta-copy">
        <h2>${headline(title)}</h2>
        ${body ? `<p>${headline(body)}</p>` : ""}
    </div>
    ${cta ? appPlate(cta) : ""}
    ${signoff(cta?.button ?? "Free at playrates.app")}
</section>`;

/**
 * "If you liked this, play that." Each slide is the lesser-known game at
 * full size, with the hit it's for written above its name. The last slide
 * gathers every recommendation and carries the pitch.
 */
export const renderPairs = (post) =>
  page([
    hookSlide(post.hook, post.pairs),
    ...post.pairs.map((pair, i) => pairSlide(pair, i + 1)),
    outroSlide(post.outro, post.pairs, post.cta),
  ]);
