import { releaseParts } from "../dates.mjs";
import { developer, escape } from "../slides.mjs";
import { INTRO, OUTRO, intro, outro, videoPage } from "./video.mjs";

// Seconds a round takes: the game in, five to guess, the year spinning in.
const THINK = 5.0;
const PER = 0.4 + THINK + 2.0;

/**
 * Guess the year a game came out: its art, cover and name, five seconds,
 * then the year spins up from a decade and a half before and lands, with
 * the full date under it. Viewers count how close they got. Release dates
 * are the games table's, the first release anywhere.
 */
export const renderGuessYear = (post) => {
  const { rounds } = post;
  for (const { game, slug } of rounds) {
    if (!releaseParts(game.date ?? "").exact)
      throw new Error(`${slug} has no exact release date`);
  }

  const stage = `
<div class="gy-round mono"></div>
${rounds
  .map(({ game, note }) => {
    const { day, month, year } = releaseParts(game.date);
    return `
<div class="gy-game" data-year="${year}">
    <div class="gy-art" style="background-image:url('${game.banner}');background-position:${game.bannerPosition}"></div>
    <div class="gy-who">
        <h3>${escape(game.title)}</h3>
        <div class="meta">${developer(game) || ""}</div>
    </div>
    <div class="gy-year">
        <div class="gy-q">What year did it come out?<b class="gy-count mono"></b></div>
        <div class="gy-n mono">????</div>
        <div class="gy-date">${escape(`${day} ${month} ${year}`)}${note ? ` · ${escape(note)}` : ""}</div>
    </div>
</div>`;
  })
  .join("")}
${intro(
  post.hook,
  `<div class="wall gy-wall">${[...rounds, ...rounds, ...rounds]
    .map(({ game }) => `<img src="${game.cover}" alt="">`)
    .join(
      "",
    )}</div><div class="v-years mono">19<span>??</span> or 20<span>??</span></div>`,
  [
    ["Timer", "5 seconds a round"],
    ["Target", "Within 2 years scores"],
    ["ListOrdered", `${rounds.length} games`],
  ],
)}
${outro(
  post.outro,
  "Rate them at playrates.app",
  rounds.slice(0, 4).map(({ game }) => game.cover),
)}`;

  const end = INTRO + rounds.length * PER;
  const script = `
const N = ${rounds.length}, PER = ${PER}, INTRO = ${INTRO}, REVEAL = ${0.4 + THINK}, THINK_LEN = ${THINK};
const games = $$(".gy-game");
window.scene = {
  duration: ${end + OUTRO},
  cover: 1.2,
  frameAt(t) {
    bookends(t, ${end});
    const playing = t >= INTRO && t < ${end};
    const i = Math.min(N - 1, Math.max(0, Math.floor((t - INTRO) / PER)));
    const local = t - INTRO - i * PER;
    $(".gy-round").textContent = playing ? "Round " + (i + 1) + " of " + N : "";
    games.forEach((g, j) => {
      const on = playing && j === i;
      g.style.opacity = on ? out(at(local, 0, 0.4)) * (1 - at(local, PER - 0.3, 0.3)) : 0;
      if (!on) return;
      $(".gy-who", g).style.transform = "translateY(" + 50 * (1 - out(at(local, 0.05, 0.45))) + "px)";
      const thinking = local >= 0.4 && local < REVEAL;
      $(".gy-count", g).textContent = thinking ? Math.ceil(REVEAL - local) : "";
      const year = +g.dataset.year, spin = at(local, REVEAL, 0.9);
      const n = $(".gy-n", g);
      n.textContent = local < REVEAL ? "????" : Math.round(year - 15 * (1 - out(spin)));
      n.classList.toggle("landed", spin >= 1);
      show($(".gy-date", g), at(local, REVEAL + 0.9, 0.3), 16);
    });
  },
};`;
  return videoPage("gy", stage, script);
};
