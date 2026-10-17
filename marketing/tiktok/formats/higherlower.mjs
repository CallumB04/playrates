import * as Lucide from "lucide-react";
import { icon, year } from "../slides.mjs";
import { INTRO, OUTRO, escape, intro, outro, videoPage } from "./video.mjs";

const { ArrowUp, Equal } = Lucide;

// Seconds a round takes: both in, five to choose, the scores, the verdict.
const THINK = 5.0;
const PER = 0.35 + THINK + 1.85;

/** Bands from frontend/src/lib/criticVerdict.ts, as on the game slides. */
const tone = (score) =>
  score >= 75
    ? "var(--critic-good)"
    : score >= 50
      ? "var(--critic-mixed)"
      : "var(--critic-poor)";

const card = (game, verdict) => `
<div class="hl-card">
    <div class="hl-art" style="background-image:url('${game.banner}');background-position:${game.bannerPosition}"></div>
    <img class="box" src="${game.cover}" alt="">
    <div class="hl-text">
        <h3>${escape(game.title)}</h3>
        <div class="meta">${year(game)}</div>
        <div class="hl-verdict">${verdict}</div>
    </div>
    <div class="hl-score mono" style="--tone:${tone(game.criticScore)}" data-score="${game.criticScore}">?</div>
</div>`;

/**
 * Which got the higher critic score: two games, a moment to pick, then both
 * scores count up and the higher one is marked. Rounds get closer as they
 * go. The scores are the games table's, IGDB's critic aggregate, as the
 * site's game pages show them.
 */
export const renderHigherLower = (post) => {
  const { rounds } = post;
  for (const { a, b } of rounds) {
    if (a.game.criticScore === null || b.game.criticScore === null)
      throw new Error(`${a.slug} or ${b.slug} has no critic score`);
  }
  const verdicts = rounds.map(({ a, b }) => {
    const diff = a.game.criticScore - b.game.criticScore;
    return diff === 0
      ? ["tie", "tie"]
      : diff > 0
        ? ["win", "lose"]
        : ["lose", "win"];
  });
  const label = (v) =>
    v === "win"
      ? `${icon(ArrowUp, 2.75)}Higher`
      : v === "tie"
        ? `${icon(Equal, 2.75)}Same score`
        : "";

  const stage = `
<div class="hl-round mono"></div>
<div class="hl-q">Which scored higher with critics?<b class="hl-count mono"></b></div>
<div class="hl-timer"><i></i></div>
${rounds
  .map(
    ({ a, b }, i) => `
<div class="hl-pair">
    ${card(a.game, label(verdicts[i][0]))}
    <div class="hl-vs">or</div>
    ${card(b.game, label(verdicts[i][1]))}
</div>`,
  )
  .join("")}
${intro(post.hook)}
${outro(post.outro, "Rate them at playrates.app")}`;

  const end = INTRO + rounds.length * PER;
  const script = `
const N = ${rounds.length}, PER = ${PER}, INTRO = ${INTRO}, REVEAL = ${0.35 + THINK};
const verdicts = ${JSON.stringify(verdicts)};
const pairs = $$(".hl-pair");
window.scene = {
  duration: ${end + OUTRO},
  cover: 1.2,
  frameAt(t) {
    bookends(t, ${end});
    const playing = t >= INTRO && t < ${end};
    const i = Math.min(N - 1, Math.max(0, Math.floor((t - INTRO) / PER)));
    const local = t - INTRO - i * PER;
    $(".hl-round").textContent = playing ? (i + 1) + "/" + N : "";
    $(".hl-q").style.opacity = playing ? 1 : 0;
    const thinking = playing && local >= 0.35 && local < REVEAL;
    $(".hl-timer").style.opacity = thinking ? 1 : 0;
    $(".hl-timer i").style.transform = "scaleX(" + (thinking ? 1 - at(local, 0.35, REVEAL - 0.35) : 0) + ")";
    $(".hl-count").textContent = thinking ? Math.ceil(REVEAL - local) : "";
    pairs.forEach((pair, j) => {
      const on = playing && j === i;
      pair.style.opacity = on ? out(at(local, 0, 0.35)) * (1 - at(local, PER - 0.3, 0.3)) : 0;
      $$(".hl-card", pair).forEach((card, k) => {
        const d = k === 0 ? 0 : 0.08;
        card.style.transform = "translateY(" + 60 * (1 - out(at(local, d, 0.4))) + "px)";
        const score = $(".hl-score", card);
        const count = at(local, REVEAL, 0.7);
        score.textContent = on && local >= REVEAL ? Math.round(+score.dataset.score * out(count)) : "?";
        score.classList.toggle("counted", on && local >= REVEAL);
        const v = verdicts[j][k], decided = on ? at(local, REVEAL + 0.75, 0.25) : 0;
        card.style.setProperty("--decided", decided);
        card.classList.toggle("win", v !== "lose" && decided > 0);
        card.classList.toggle("lose", v === "lose" && decided > 0);
      });
    });
  },
};`;
  return videoPage("hl", stage, script);
};
