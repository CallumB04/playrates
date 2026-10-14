import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as Lucide from "lucide-react";

const { ArrowRight, CircleCheck, Flag, Heart, Layers, Play } = Lucide;

const icon = (Icon) =>
  renderToStaticMarkup(
    createElement(Icon, { strokeWidth: 2.25, "aria-hidden": true }),
  );

// Same hues and marks as constants/gameStatus.ts, night theme.
const STATUS = {
  played: { label: "Played", Icon: CircleCheck, hue: "var(--status-played)" },
  playing: { label: "Playing", Icon: Play, hue: "var(--status-playing)" },
  backlog: { label: "Backlog", Icon: Layers, hue: "var(--status-backlog)" },
  wishlist: { label: "Wishlist", Icon: Heart, hue: "var(--status-wishlist)" },
  finished: { label: "Finished", Icon: Flag, hue: "var(--status-finished)" },
};

const logo = readFileSync(
  new URL("../../frontend/public/favicon.svg", import.meta.url),
  "utf8",
).replace(/ role="img" aria-label="PlayRates"/, "");

const escape = (text) =>
  String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

/** `*word*` marks the one word a headline leans on; `\n` forces a break
 *  where the browser's own wrapping strands a word. */
const headline = (text) =>
  escape(text)
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replaceAll("\n", "<br>");

const brand = `<div class="brand">${logo}PlayRates</div>`;

const chip = (status) => {
  const { label, Icon, hue } = STATUS[status];
  return `<span class="chip" style="--hue:${hue}">${icon(Icon)}${label}</span>`;
};

/** Bands from frontend/src/lib/criticVerdict.ts. */
const criticTone = (score) =>
  score >= 75
    ? "var(--critic-good)"
    : score >= 50
      ? "var(--critic-mixed)"
      : "var(--critic-poor)";

const hookSlide = (hook, games) => `
<section class="slide hook" data-name="hook">
    <div class="wall">${games
      .concat(games)
      .map((game) => `<img src="${game.cover}" alt="">`)
      .join("")}</div>
    <div class="shade"></div>
    ${brand}
    <div class="hook-copy">
        <span class="kicker">${icon(Lucide[hook.icon ?? "Trophy"])}${escape(hook.kicker)}</span>
        <h1>${headline(hook.title)}</h1>
        ${hook.subtitle ? `<p>${headline(hook.subtitle)}</p>` : ""}
        <span class="swipe">Swipe ${icon(ArrowRight)}</span>
    </div>
</section>`;

const libraryRow = ({ game, title, status, rating }) => `
<div class="row">
    <img src="${game.cover}" alt="">
    <div class="row-main">
        <div class="row-title">${escape(title ?? game.title)}</div>
        ${chip(status)}
    </div>
    ${
      rating === undefined
        ? `<div class="row-rating empty mono">—</div>`
        : `<div class="row-rating mono">${rating.toFixed(2)}<small>/10</small></div>`
    }
</div>`;

const ctaSlide = (cta, library) => `
<section class="slide cta" data-name="cta">
    ${brand}
    <h2>${headline(cta.title)}</h2>
    <p>${headline(cta.body)}</p>
    <div class="library">${library.map(libraryRow).join("")}</div>
    <div class="button">${escape(cta.button)} ${icon(ArrowRight)}</div>
</section>`;

const gameSlide = (game, rank, { showCriticScore, statIcon }) => {
  const year = game.releaseDate?.slice(0, 4);
  const meta = [
    year && `<span class="mono">${year}</span>`,
    game.developer && `<span class="dev">${escape(game.developer)}</span>`,
    game.stat &&
      `<span class="stat">${icon(Lucide[statIcon ?? "Clock"])}<span class="mono">${escape(game.stat)}</span></span>`,
  ].filter(Boolean);
  const critic =
    showCriticScore && game.criticScore !== null
      ? `<span class="critic" style="--tone:${criticTone(game.criticScore)}"><b class="mono">${game.criticScore}</b><span>Critics</span></span>`
      : "";

  return `
<section class="slide game" data-name="rank-${String(rank).padStart(2, "0")}">
    <div class="hero" style="background-image:url('${game.banner}');background-position:${game.bannerPosition}"></div>
    ${brand}
    <div class="game-body">
        <div class="lead">
            <img class="box" src="${game.cover}" alt="">
            <div class="rank${rank === 1 ? " top" : ""}"><span class="hash">#</span><span class="n">${rank}</span></div>
        </div>
        <h3>${escape(game.title)}</h3>
        <div class="meta">${meta.join('<span class="dot"></span>')}${critic ? '<span class="dot"></span>' + critic : ""}</div>
        <p class="blurb">${escape(game.blurb)}</p>
        <div class="log-it"><span>Log it</span>${chip("played")}${chip("backlog")}${chip("wishlist")}<span class="url">playrates.app</span></div>
    </div>
</section>`;
};

/**
 * The whole post as one page, a 1080x1920 section per slide. `games` arrive
 * ranked, #1 first; a countdown shows them from the bottom up so the reveal
 * is the last swipe.
 */
export const renderPost = (post, games, library) => {
  const ranked = games.map((game, i) => ({ game, rank: i + 1 }));
  const shown = post.order === "countdown" ? [...ranked].reverse() : ranked;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<link rel="stylesheet" href="slides.css">
</head>
<body>
${hookSlide(
  post.hook,
  shown.map(({ game }) => game),
)}
${ctaSlide(post.cta, library)}
${shown.map(({ game, rank }) => gameSlide(game, rank, post)).join("\n")}
</body>
</html>`;
};
