import {
  countdown,
  daysBetween,
  releaseOrder,
  releaseParts,
} from "../dates.mjs";
import {
  brand,
  brandWith,
  button,
  chip,
  ctaSlide,
  developer,
  escape,
  headline,
  metaLine,
  page,
  swipe,
} from "../slides.mjs";

const shortDate = (date) => {
  const { day, month, year } = releaseParts(date);
  return day ? `${day} ${month}` : month ? `${month} ${year}` : year;
};

/** The first few releases as a timeline down a spine; the rest are a count. */
const hookSlide = ({ title, subtitle, show = 4 }, games) => `
<section class="slide upcoming-hook" data-name="hook">
    <div class="upcoming-glow bleed"></div>
    ${brand}
    <ol class="timeline">${games
      .slice(0, show)
      .map(
        ({ game }) => `
        <li>
            <span class="timeline-date mono">${shortDate(game.date)}</span>
            <img src="${game.cover}" alt="">
            <div>
                <div class="timeline-title clip">${escape(game.short)}</div>
                <div class="timeline-dev clip">${escape(game.developer ?? "")}</div>
            </div>
        </li>`,
      )
      .join("")}${
      games.length > show
        ? `<li class="timeline-more"><span class="timeline-date mono"></span><span>+${games.length - show} more</span></li>`
        : ""
    }</ol>
    <div class="upcoming-copy">
        <h1>${headline(title)}</h1>
        ${subtitle ? `<p>${headline(subtitle)}</p>` : ""}
        ${swipe}
    </div>
</section>`;

/** A desk calendar's page, and how long is left from the day of posting. */
const when = (date, postDate) => {
  const parts = releaseParts(date);
  const tile = parts.exact
    ? `<div class="cal"><span class="cal-month">${parts.month}</span><span class="cal-day">${parts.day}</span><span class="cal-year mono">${parts.year}</span></div>`
    : `<div class="cal loose"><span class="cal-month">${parts.month ?? "Date TBC"}</span><span class="cal-day">${parts.year}</span><span class="cal-year mono">${parts.month ? "Day TBC" : " "}</span></div>`;
  if (!parts.exact) {
    return `${tile}<div class="count loose"><span>Exact date</span><b>TBA</b><span>&nbsp;</span></div>`;
  }
  const { lead, figure, unit } = countdown(daysBetween(postDate, date));
  const word = /^\d+$/.test(figure) ? "" : " word";
  return `${tile}<div class="count${word}"><span>${lead}</span><b>${figure}</b><span>${unit}</span></div>`;
};

const releaseSlide = ({ game }, i, total, postDate) => `
<section class="slide release" data-name="release-${String(i).padStart(2, "0")}">
    <div class="release-hero bleed" style="background-image:url('${game.banner}');background-position:${game.bannerPosition}"></div>
    ${brandWith(`${i}/${total}`)}
    <div class="release-body">
        <div class="release-when">${when(game.date, postDate)}</div>
        <h3>${escape(game.title)}</h3>
        ${metaLine([developer(game)])}
        <p class="blurb">${escape(game.blurb)}</p>
        <div class="log-it">${chip("wishlist", "Add to wishlist")}<span class="url">playrates.app</span></div>
    </div>
</section>`;

const outroSlide = ({ title, body }, games) => `
<section class="slide upcoming-outro" data-name="outro">
    ${brand}
    <h2>${headline(title)}</h2>
    <div class="library dated">${games
      .map(
        ({ game }) => `
        <div class="row">
            <img src="${game.cover}" alt="">
            <div class="row-title">${escape(game.short)}</div>
            <span class="row-date mono">${shortDate(game.date)}</span>
        </div>`,
      )
      .join("")}</div>
    ${body ? `<p>${headline(body)}</p>` : ""}
    ${button("Wishlist them free at playrates.app")}
</section>`;

/**
 * Releases still to come, soonest first, each on a calendar page with a
 * countdown from the day the post goes out (`date`), ending on the whole lot
 * as a wishlist. A game IGDB only has a year or month for takes a `date`
 * override of "2027" or "2027-03".
 */
export const renderUpcoming = (post) => {
  if (!post.date)
    throw new Error("an upcoming post needs the `date` it goes out");
  const games = [...post.games].sort((a, b) =>
    releaseOrder(a.game.date, b.game.date),
  );
  return page([
    hookSlide(post.hook, games),
    ctaSlide(post.cta),
    ...games.map((entry, i) =>
      releaseSlide(entry, i + 1, games.length, post.date),
    ),
    outroSlide(post.outro, games),
  ]);
};
