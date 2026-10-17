import { developer, metaLine, year } from "../slides.mjs";
import { INTRO, OUTRO, escape, intro, outro, videoPage } from "./video.mjs";

// Seconds a round takes: the picture sharpening, then the answer.
const GUESS = 5.0;
const ANSWER = 1.3;
const PER = GUESS + ANSWER;

/**
 * Guess the game from a screenshot that starts as a handful of blocks and
 * sharpens while a five-second count runs down, then the answer. Played
 * along with, and counted up in the comments. `rounds` run easiest first;
 * each round's `banner` is the screenshot, an IGDB image id like a slide's.
 */
export const renderGuess = (post) => {
  const { rounds } = post;
  const stage = `
<div class="gs-round mono"></div>
<div class="gs-frame">
    <canvas width="868" height="980"></canvas>
    <div class="gs-count"><b class="mono"></b></div>
</div>
${rounds
  .map(({ game }) => `<img class="gs-src" src="${game.banner}" alt="">`)
  .join("")}
<div class="gs-below">
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
${intro(post.hook)}
${outro(post.outro, "Rate them at playrates.app")}`;

  const end = INTRO + rounds.length * PER;
  const script = `
const N = ${rounds.length}, PER = ${PER}, GUESS = ${GUESS}, INTRO = ${INTRO};
const canvas = $(".gs-frame canvas"), ctx = canvas.getContext("2d");
const small = document.createElement("canvas"), sctx = small.getContext("2d");
const srcs = $$(".gs-src"), answers = $$(".gs-answer");
// Cover-crop the screenshot into the frame, at w x h.
const draw = (c, img, w, h) => {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / scale, sh = h / scale;
  c.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, 0, 0, w, h);
};
window.scene = {
  duration: ${end + OUTRO},
  cover: 1.2,
  frameAt(t) {
    bookends(t, ${end});
    const i = Math.min(N - 1, Math.max(0, Math.floor((t - INTRO) / PER)));
    const local = t - INTRO - i * PER;
    const playing = t >= INTRO && t < ${end};
    const W = canvas.width, H = canvas.height;
    // Coarse for most of the count, so the shape is all there is to go on;
    // it only comes clear in the last moment, with the answer.
    const p = playing ? at(local, 0, GUESS) : t < INTRO ? 0 : 1;
    const block = p >= 1 ? 1 : Math.max(6, Math.round(110 * Math.pow(1 - p, 1.3)));
    if (block <= 1) {
      ctx.imageSmoothingEnabled = true;
      draw(ctx, srcs[i], W, H);
    } else {
      small.width = Math.ceil(W / block);
      small.height = Math.ceil(H / block);
      draw(sctx, srcs[i], small.width, small.height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(small, 0, 0, small.width, small.height, 0, 0, small.width * block, small.height * block);
    }
    $(".gs-frame").style.opacity = t < INTRO - 0.2 ? 0 : 1 - at(t, ${end}, 0.4);
    const left = Math.ceil(GUESS - local);
    const counting = playing && local < GUESS;
    $(".gs-count b").textContent = counting ? left : "";
    $(".gs-count").style.opacity = counting ? 1 : 0;
    $(".gs-count").style.setProperty("--p", counting ? (local % 1) : 0);
    $(".gs-round").textContent = playing ? "Round " + (i + 1) + " of " + N : "";
    $(".gs-prompt").style.opacity = counting ? 1 : 0;
    answers.forEach((a, j) => show(a, j === i && playing ? out(at(local, GUESS, 0.3)) : 0, 40));
  },
};`;
  return videoPage("gs", stage, script);
};
