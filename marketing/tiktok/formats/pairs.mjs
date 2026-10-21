import {
  brand,
  brandWith,
  button,
  footer,
  icon,
  Lucide,
  ctaSlide,
  developer,
  escape,
  headline,
  metaLine,
  page,
  swipe,
  year,
} from "../slides.mjs";

const { Heart } = Lucide;

/** The first pairs, with what to play next hidden behind a blur. */
const hookSlide = ({ title, subtitle }, pairs) => `
<section class="slide pairs-hook" data-name="hook">
    <div class="pairs-hook-glow bleed"></div>
    ${brand}
    <div class="pairs-teaser">${pairs
      .slice(0, 3)
      .map(
        ({ from, to }) => `
        <div class="teaser">
            <img class="teaser-from" src="${from.game.cover}" alt="">
            <span class="teaser-thread"></span>
            <div class="teaser-to"><img src="${to.game.cover}" alt=""><span>?</span></div>
        </div>`,
      )
      .join("")}</div>
    <div class="pairs-copy">
        <h1>${headline(title)}</h1>
        ${subtitle ? `<p>${headline(subtitle)}</p>` : ""}
        ${swipe}
    </div>
</section>`;

/* The thread from one game to the next is the site's reply thread: a line
   run down from what came first. */
const pairSlide = ({ from, to, why }, i, total) => `
<section class="slide pair" data-name="pair-${i}">
    <div class="pair-art bleed" style="background-image:url('${to.game.banner}');background-position:${to.game.bannerPosition}"></div>
    ${brandWith(`${i}/${total}`)}
    <div class="pair-from">
        <img src="${from.game.cover}" alt="">
        <div>
            <span class="pair-label">If you liked</span>
            <div class="pair-from-title clip">${escape(from.game.title)}</div>
        </div>
    </div>
    <div class="pair-thread"><span class="pair-why">${escape(why)}</span></div>
    <div class="pair-to">
        <img class="box" src="${to.game.cover}" alt="">
        <h3>${escape(to.game.title)}</h3>
        ${metaLine([year(to.game), developer(to.game)])}
        <p class="blurb">${escape(to.game.blurb)}</p>
        ${footer("Wishlist it", "wishlist")}
    </div>
</section>`;

/** Every recommendation as covers on a shelf, each wearing the heart the
 *  site puts on a wishlisted tile. */
const outroSlide = ({ title, body }, pairs) => `
<section class="slide pairs-outro" data-name="outro">
    ${brand}
    <h2>${headline(title)}</h2>
    <div class="pairs-grid">${pairs
      .map(
        ({ to }) => `
        <figure>
            <img src="${to.game.cover}" alt="">
            <span class="heart">${icon(Heart, 2.5)}</span>
        </figure>`,
      )
      .join("")}</div>
    ${body ? `<p>${headline(body)}</p>` : ""}
    ${button("Wishlist them at playrates.app")}
</section>`;

/**
 * "If you liked this, play that." Each slide starts from a game the viewer
 * knows and runs a thread down to one they probably don't, with the reason
 * on the thread. The last slide gathers every recommendation as a wishlist.
 */
export const renderPairs = (post) => {
  const { pairs } = post;
  return page([
    hookSlide(post.hook, pairs),
    ...pairs.map((pair, i) => pairSlide(pair, i + 1, pairs.length)),
    outroSlide(post.outro, pairs),
    // A short post: the sign-up slide goes last, not into the middle.
    ...(post.cta ? [ctaSlide(post.cta, "")] : []),
  ]);
};
