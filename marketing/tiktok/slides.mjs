import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as Lucide from "lucide-react";

const { ArrowRight, ArrowUpRight, CircleCheck, Flag, Heart, Layers, Play } =
  Lucide;

export { Lucide };

export const icon = (Icon, strokeWidth = 2.25) =>
  renderToStaticMarkup(
    createElement(Icon, { strokeWidth, "aria-hidden": true }),
  );

// Same hues and marks as constants/gameStatus.ts, night theme.
const STATUS = {
  played: { label: "Played", Icon: CircleCheck, hue: "var(--status-played)" },
  playing: { label: "Playing", Icon: Play, hue: "var(--status-playing)" },
  backlog: { label: "Backlog", Icon: Layers, hue: "var(--status-backlog)" },
  wishlist: { label: "Wishlist", Icon: Heart, hue: "var(--status-wishlist)" },
  finished: { label: "Finished", Icon: Flag, hue: "var(--status-finished)" },
};

// An image rather than inline SVG: the logo's gradients are found by id, and
// a page of slides repeats it.
const logo = `<img class="logo" alt="" src="data:image/svg+xml;base64,${readFileSync(
  new URL("../../frontend/public/favicon.svg", import.meta.url),
).toString("base64")}">`;

export const escape = (text) =>
  String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

/** `*word*` marks the one word a headline leans on; `\n` forces a break
 *  where the browser's own wrapping strands a word. */
export const headline = (text) =>
  escape(text)
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replaceAll("\n", "<br>");

export const brand = `<div class="brand">${logo}PlayRates</div>`;

/** The brand line with a figure at the far end, like "3/6" on a pair. */
export const brandWith = (aside) =>
  `<div class="brand">${logo}PlayRates<span class="brand-aside mono">${aside}</span></div>`;

/** StatusBadge's `plain` form: mark and word in the status hue, no pill.
 *  A row of outlined pills read as stickers, not as the product. */
export const statusMark = (status) => {
  const { label, Icon, hue } = STATUS[status];
  return `<span class="mark" style="--hue:${hue}">${icon(Icon)}${label}</span>`;
};

/** The last line of a game slide: what to do about it on the left, where to
 *  do it on the right, under a hairline. */
export const footer = (action, status) => {
  const { Icon, hue } = STATUS[status];
  return `<div class="foot"><span class="foot-action" style="--hue:${hue}">${icon(Icon)}${escape(action)}</span><span class="foot-url">playrates.app${icon(ArrowUpRight)}</span></div>`;
};

export const swipe = `<span class="swipe">Swipe ${icon(ArrowRight)}</span>`;

export const button = (text) => signoff(text);

/** Bands from frontend/src/lib/criticVerdict.ts. */
const criticTone = (score) =>
  score >= 75
    ? "var(--critic-good)"
    : score >= 50
      ? "var(--critic-mixed)"
      : "var(--critic-poor)";

export const critic = (score) =>
  `<span class="critic" style="--tone:${criticTone(score)}"><b class="mono">${score}</b><span>Critics</span></span>`;

/** Year, developer and whatever else a slide wants in its details line. */
export const metaLine = (parts) =>
  `<div class="meta">${parts.filter(Boolean).join('<span class="dot"></span>')}</div>`;

export const year = (game) =>
  game.releaseDate &&
  `<span class="mono">${game.releaseDate.slice(0, 4)}</span>`;

export const developer = (game) =>
  game.developer && `<span class="dev">${escape(game.developer)}</span>`;

/**
 * The site's rating control: twenty segments, one per half point. Empty, it
 * asks for the viewer's own rating, which is the thing PlayRates is for.
 */
export const meter = (value = null, label = "Your rating") => {
  const filled = value === null ? 0 : Math.round(value * 2);
  return `
<div class="meter">
    <div class="meter-head"><span>${escape(label)}</span>${
      value === null
        ? `<span class="meter-value empty mono">—<small>/10</small></span>`
        : `<span class="meter-value mono">${value.toFixed(2)}<small>/10</small></span>`
    }</div>
    <div class="meter-track">${Array.from(
      { length: 20 },
      (_, i) => `<i${i < filled ? ' class="on"' : ""}></i>`,
    ).join("")}</div>
</div>`;
};

const libraryRow = ({ game, title, status, rating }) => `
<div class="app-row">
    <img src="${game.cover}" alt="">
    <div class="app-main">
        <div class="row-title">${escape(title ?? game.title)}</div>
        ${statusMark(status)}
    </div>
    ${
      rating === undefined
        ? `<div class="app-rating empty mono">—</div>`
        : `<div class="app-rating mono">${rating.toFixed(2)}<small>/10</small></div>`
    }
</div>`;

/**
 * The sign-up slide, dropped in before the last few slides rather than
 * second: someone who has swiped that far is invested, where on slide 2 it
 * reads as an ad and they leave. `kicker` names the moment ("Before the top
 * 3"), the plate shows the product, and the address is a line of text, not a
 * button, because nothing on a photo post can be tapped.
 */
export const ctaSlide = (cta, kicker = cta.kicker ?? "Before the top 3") => `
<section class="slide cta" data-name="cta">
    ${brand}
    <div class="cta-copy">
        <span class="kicker">${escape(kicker)}</span>
        <h2>${headline(cta.title)}</h2>
        ${cta.body ? `<p>${headline(cta.body)}</p>` : ""}
    </div>
    <div class="app">${(cta.library ?? []).map(libraryRow).join("")}</div>
    ${signoff(cta.button ?? "Free at playrates.app")}
</section>`;

/** The address, as words. Ember marks it, the way it marks the logo. */
export const signoff = (text) =>
  `<div class="signoff">${headline(text)}<i></i></div>`;

/** Puts the sign-up slide in front of the last `last` slides. */
export const withCta = (slides, cta, last = 3, kicker) =>
  cta
    ? [...slides.slice(0, -last), ctaSlide(cta, kicker), ...slides.slice(-last)]
    : slides;

/**
 * One item of a list at full size: the art behind the whole slide, the
 * number drawn in outline across it (the winner filled), then the title and
 * a single line. Nothing else: a rating nobody has given yet, a footer or a
 * row of badges all made the slide read as generated.
 */
export const featureSlide = ({
  name,
  art,
  position,
  rank,
  filled = rank === 1,
  title,
  caption,
  body,
}) => `
<section class="slide feature" data-name="${name}">
    <div class="feature-art bleed" style="background-image:url('${art}');background-position:${position ?? "center"}"></div>
    ${brand}
    <div class="feature-body">
        ${rank !== undefined ? `<div class="numeral${filled ? " top" : ""}">${rank}</div>` : ""}
        <h3>${headline(title)}</h3>
        ${caption ? `<div class="caption">${caption}</div>` : ""}
        ${body ? `<p class="line" data-max-lines="2">${headline(body)}</p>` : ""}
    </div>
</section>`;

export const page = (slides) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<link rel="stylesheet" href="slides.css">
</head>
<body>
${slides.join("\n")}
<script>
// A word set to fill the slide's width, whatever its length. Measured once
// the fonts are in, or it fits the fallback face; render.mjs waits on this.
window.fitted = document.fonts.ready.then(() => {
  for (const el of document.querySelectorAll(".fit")) {
    el.style.fontSize = "100px";
    const width = el.parentElement.clientWidth * (Number(el.dataset.fill) || 1);
    el.style.fontSize = (100 * width) / el.scrollWidth + "px";
  }
});
</script>
</body>
</html>`;
