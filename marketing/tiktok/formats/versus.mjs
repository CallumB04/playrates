import { escape } from "../slides.mjs";
import { INTRO, OUTRO, faceOff, intro, outro, videoPage } from "./video.mjs";

// Seconds a round takes: both in, five to choose, the figures, the verdict.
const THINK = 5.0;
const PER = 0.35 + THINK + 1.85;

/**
 * Two games head to head over eight rounds: a question, five seconds to
 * choose, then each card's figure counts up and the winner is marked. What
 * is compared, and how it reads, comes from `spec`:
 *
 * - `question` — the line over the timer
 * - `value(game)` — the number compared; `best` is "high" or "low"
 * - `figure(game)` — `{ from, to, sub?, tone? }`: the count and what's under it
 * - `meta(game)` — the details line, which must not give the answer away
 * - `win`, `tie` — the verdict labels, as HTML
 * - `facts(rounds)` — the rules on the opening card
 */
export const renderVersus = (post, kind, spec) => {
  const { rounds } = post;
  const verdicts = rounds.map(({ a, b }) => {
    const diff = spec.value(a.game) - spec.value(b.game);
    if (diff === 0) return ["tie", "tie"];
    const aWins = spec.best === "high" ? diff > 0 : diff < 0;
    return aWins ? ["win", "lose"] : ["lose", "win"];
  });
  const label = (v) => (v === "win" ? spec.win : v === "tie" ? spec.tie : "");

  // Each game fills half the stage, its figure across the art, so the pair
  // reads as a split screen rather than two cards on black.
  const card = (game, verdict) => {
    const { from, to, sub, tone } = spec.figure(game);
    return `
<div class="hl-card">
    <div class="hl-art" style="background-image:url('${game.banner}');background-position:${game.bannerPosition}"></div>
    <div class="hl-text">
        <h3>${escape(game.title)}</h3>
        <div class="meta">${spec.meta(game)}</div>
        <div class="hl-verdict">${verdict}</div>
    </div>
    <div class="hl-score mono${sub ? " has-sub" : ""}" style="--tone:${tone ?? "#fff"}" data-from="${from}" data-to="${to}"><span class="hl-n">?</span>${sub ? `<small>${escape(sub)}</small>` : ""}</div>
</div>`;
  };

  const stage = `
${rounds
  .map(
    ({ a, b }, i) => `
<div class="hl-pair">
    ${card(a.game, label(verdicts[i][0]))}
    ${card(b.game, label(verdicts[i][1]))}
</div>`,
  )
  .join("")}
<div class="hl-head"><span class="hl-round"></span><div class="hl-q">${escape(spec.question)}</div></div>
<div class="hl-vs mono"><b></b></div>
${(() => {
  // The pair the hook teases: the last round's unless the hook names one.
  const { a, b } = rounds[post.hook.pair ?? rounds.length - 1];
  return intro(post.hook, faceOff(a.game, b.game), spec.facts(rounds.length));
})()}
${outro(
  post.outro,
  "Rate them at playrates.app",
  rounds.flatMap(({ a, b }) => [a.game.cover, b.game.cover]),
)}`;

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
    $(".hl-round").textContent = playing ? "Round " + (i + 1) + " of " + N : "";
    $(".hl-head").style.opacity = playing ? 1 : 0;
    $(".hl-vs").style.opacity = playing ? 1 : 0;
    // The disc on the seam counts the five seconds, then says "or" again.
    const thinking = playing && local >= 0.35 && local < REVEAL;
    $(".hl-vs b").textContent = thinking ? Math.ceil(REVEAL - local) : "or";
    $(".hl-vs").classList.toggle("counting", thinking);
    pairs.forEach((pair, j) => {
      const on = playing && j === i;
      pair.style.opacity = on ? out(at(local, 0, 0.35)) * (1 - at(local, PER - 0.3, 0.3)) : 0;
      $$(".hl-card", pair).forEach((card, k) => {
        const d = k === 0 ? 0 : 0.08;
        card.style.transform = "translateX(" + (k === 0 ? -1 : 1) * 80 * (1 - out(at(local, d, 0.4))) + "px)";
        const score = $(".hl-score", card);
        const from = +score.dataset.from, to = +score.dataset.to;
        const counting = on && local >= REVEAL;
        $(".hl-n", score).textContent = counting ? Math.round(from + (to - from) * out(at(local, REVEAL, 0.7))) : "?";
        score.classList.toggle("counted", counting);
        const v = verdicts[j][k], decided = on ? at(local, REVEAL + 0.75, 0.25) : 0;
        card.style.setProperty("--decided", decided);
        card.classList.toggle("win", v !== "lose" && decided > 0);
        card.classList.toggle("lose", v === "lose" && decided > 0);
      });
    });
  },
};`;
  return videoPage(kind, stage, script);
};
