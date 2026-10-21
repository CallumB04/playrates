import { developer, metaLine, year } from "../slides.mjs";
import { INTRO, OUTRO, escape, intro, outro, videoPage } from "./video.mjs";

// Seconds a round takes: the picture sharpening, then the answer.
const GUESS = 5.0;
const ANSWER = 1.3;
const PER = GUESS + ANSWER;

// The stage, and how coarse the blocks start: the shape and the colours are
// all there is to go on until the last second.
const W = 1080;
const H = 1920;
const COARSEST = 150;

/**
 * Guess the game from a screenshot that fills the screen as a handful of
 * blocks and sharpens while a five-second count runs down, then the answer.
 * Played along with, and counted up in the comments. `rounds` run easiest
 * first; each round's `banner` is the screenshot, an IGDB image id like a
 * slide's. The opening is the first round's screenshot at its coarsest,
 * edge to edge, so the cover is all colour rather than a card on black.
 */
export const renderGuess = (post) => {
  const { rounds } = post;
  const stage = `
<div class="gs-frame"><canvas width="${W}" height="${H}"></canvas></div>
<div class="gs-shade"></div>
${rounds
  .map(({ game }) => `<img class="gs-src" src="${game.banner}" alt="">`)
  .join("")}
<div class="gs-count mono"></div>
<div class="gs-below">
    <span class="gs-round"></span>
    <div class="gs-prompt">Name the game</div>
    ${rounds
      .map(
        ({ game }) => `
    <div class="gs-answer">
        <h3>${escape(game.title)}</h3>
        ${metaLine([year(game), developer(game)])}
    </div>`,
      )
      .join("")}
</div>
${intro(
  post.hook,
  `<canvas class="gs-cover" width="${W}" height="${H}"></canvas>`,
  [
    ["Timer", "5 seconds a round"],
    ["ListOrdered", `${rounds.length} rounds`],
  ],
)}
${outro(
  post.outro,
  "Rate them at playrates.app",
  rounds.slice(0, 4).map(({ game }) => game.cover),
)}`;

  const end = INTRO + rounds.length * PER;
  const script = `
const N = ${rounds.length}, PER = ${PER}, GUESS = ${GUESS}, INTRO = ${INTRO};
const W = ${W}, H = ${H};
const canvas = $(".gs-frame canvas"), ctx = canvas.getContext("2d");
const small = document.createElement("canvas"), sctx = small.getContext("2d");
const srcs = $$(".gs-src"), answers = $$(".gs-answer");
// Cover-crop the screenshot into w x h.
const draw = (c, img, w, h) => {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / scale, sh = h / scale;
  c.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, 0, 0, w, h);
};
const blocks = (target, img, block) => {
  const x = target.getContext("2d");
  if (block <= 1) {
    x.imageSmoothingEnabled = true;
    draw(x, img, W, H);
    return;
  }
  small.width = Math.ceil(W / block);
  small.height = Math.ceil(H / block);
  draw(sctx, img, small.width, small.height);
  x.imageSmoothingEnabled = false;
  x.drawImage(small, 0, 0, small.width, small.height, 0, 0, small.width * block, small.height * block);
};
let cover = false;
window.scene = {
  duration: ${end + OUTRO},
  cover: 1.2,
  frameAt(t) {
    if (!cover) { blocks($(".gs-cover"), srcs[0], ${COARSEST}); cover = true; }
    bookends(t, ${end});
    const i = Math.min(N - 1, Math.max(0, Math.floor((t - INTRO) / PER)));
    const local = t - INTRO - i * PER;
    const playing = t >= INTRO && t < ${end};
    const p = playing ? at(local, 0, GUESS) : t < INTRO ? 0 : 1;
    const block = p >= 1 ? 1 : Math.max(8, Math.round(${COARSEST} * Math.pow(1 - p, 1.3)));
    blocks(canvas, srcs[i], block);
    const live = t < INTRO - 0.2 ? 0 : 1 - at(t, ${end}, 0.4);
    $(".gs-frame").style.opacity = live;
    $(".gs-shade").style.opacity = live;
    const counting = playing && local < GUESS;
    $(".gs-count").textContent = counting ? Math.ceil(GUESS - local) : "";
    // Each second lands big and settles, so the count reads as a beat.
    show($(".gs-count"), counting ? out(at(local % 1, 0, 0.25)) : 0, 0, 1.12);
    $(".gs-round").textContent = playing ? "Round " + (i + 1) + " of " + N : "";
    $(".gs-round").style.opacity = playing ? 1 : 0;
    $(".gs-prompt").style.opacity = counting ? 1 : 0;
    answers.forEach((a, j) => show(a, j === i && playing ? out(at(local, GUESS, 0.3)) : 0, 40));
  },
};`;
  return videoPage("gs", stage, script);
};
