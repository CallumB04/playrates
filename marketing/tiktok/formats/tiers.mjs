import {
  brand,
  brandWith,
  button,
  withCta,
  escape,
  headline,
  page,
  swipe,
} from "../slides.mjs";

// Status hues from the site, so a tier reads in the same colours as a log.
const TIER_HUE = {
  S: "var(--ember-500)",
  A: "var(--iris-400)",
  B: "var(--status-backlog)",
  C: "var(--status-wishlist)",
  D: "var(--ink-400)",
};

const hue = (tier) => {
  const value = TIER_HUE[tier.tier];
  if (!value) throw new Error(`no colour for tier "${tier.tier}"`);
  return value;
};

const letter = (tier, className = "tier-letter") =>
  `<div class="${className}" style="--tier:${hue(tier)}"><span>${escape(tier.tier)}</span></div>`;

const covers = (tier) =>
  tier.games.map(({ game }) => `<img src="${game.cover}" alt="">`).join("");

/** The board with every cover blurred: the shape of the answer, not the
 *  answer. */
const hookSlide = ({ title, subtitle }, tiers) => `
<section class="slide tiers-hook" data-name="hook">
    <div class="ghost-board bleed">${tiers
      .map(
        (tier) => `
        <div class="ghost-row">${letter(tier, "ghost-letter")}<div class="ghost-covers">${covers(tier)}${covers(tier)}</div></div>`,
      )
      .join("")}</div>
    <div class="ghost-shade bleed"></div>
    ${brand}
    <div class="tiers-copy">
        <h1>${headline(title)}</h1>
        ${subtitle ? `<p>${headline(subtitle)}</p>` : ""}
        ${swipe}
    </div>
</section>`;

const placedRow = (tier) => `
<div class="placed">${letter(tier, "placed-letter")}<div class="placed-covers">${covers(tier)}</div></div>`;

/** One tier in full, with the tiers already placed sitting under it, as
 *  they will on the finished board. */
const tierSlide = (tier, below, step, total) => `
<section class="slide tier" data-name="tier-${tier.tier.toLowerCase()}" style="--tier:${hue(tier)}">
    <div class="tier-glow bleed"></div>
    ${brandWith(`${step}/${total}`)}
    <div class="tier-head">
        ${letter(tier)}
        <div>
            <div class="tier-name">${escape(tier.name)}</div>
            <p class="tier-note" data-max-lines="3">${escape(tier.note)}</p>
        </div>
    </div>
    <div class="tier-games" style="--count:${tier.games.length}">${tier.games
      .map(
        ({ game }) => `
        <figure>
            <img src="${game.cover}" alt="">
            <figcaption data-max-lines="3">${escape(game.title)}</figcaption>
            <span class="mono">${game.releaseDate?.slice(0, 4) ?? ""}</span>
        </figure>`,
      )
      .join("")}</div>
    ${below.length ? `<div class="placed-stack">${below.map(placedRow).join("")}</div>` : ""}
</section>`;

const boardSlide = ({ title, body }, tiers) => `
<section class="slide tier-board" data-name="board">
    ${brand}
    <h2>${headline(title)}</h2>
    <div class="board">${tiers
      .map(
        (tier) => `
        <div class="board-row">${letter(tier, "board-letter")}<div class="board-covers">${covers(tier)}</div></div>`,
      )
      .join("")}</div>
    ${body ? `<p>${headline(body)}</p>` : ""}
    ${button("Rate them at playrates.app")}
</section>`;

/**
 * A tier list, revealed from the bottom tier up so the top one is the last
 * swipe, then the finished board. `tiers` arrive best first, as the board
 * reads.
 */
export const renderTiers = (post) => {
  const { tiers } = post;
  const reveal = [...tiers].reverse();
  return page([
    hookSlide(post.hook, tiers),
    ...withCta(
      reveal.map((tier, i) =>
        tierSlide(
          tier,
          tiers.slice(tiers.indexOf(tier) + 1),
          i + 1,
          tiers.length,
        ),
      ),
      post.cta,
      1,
      `Before the ${tiers[0].tier} tier`,
    ),
    boardSlide(post.outro, tiers),
  ]);
};
