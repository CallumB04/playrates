import * as Lucide from "lucide-react";
import { brand, escape, headline, icon, logo, signoff } from "../slides.mjs";

/**
 * What every video scene's script starts with. `at(t, start, length)` is how
 * far through a moment `t` is, 0 to 1, so a frame is a pure function of
 * time and the recorder can step through it at any speed.
 */
const CLIENT = `
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const at = (t, start, length) => clamp((t - start) / length);
const out = (x) => 1 - Math.pow(1 - x, 3);
const inOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const show = (el, p, dy = 0, scale = 1) => {
  el.style.opacity = p;
  el.style.transform = "translateY(" + dy * (1 - p) + "px) scale(" + (scale + (1 - scale) * p) + ")";
};
`;

export const INTRO = 2.4;
export const OUTRO = 3.6;

/**
 * The opening card, which is also the video's cover: a picture of the quiz
 * that gives nothing away (`visual`), then the claim, and the rules as a
 * line of marks (`facts`: `[LucideName, text]` pairs).
 */
export const intro = ({ title, subtitle, label }, visual, facts = []) => `
<div class="v-intro">
    <div class="v-visual">${visual}</div>
    <div class="v-copy">
        <span class="v-label">${escape(label ?? "Gaming quiz")}</span>
        <h1>${headline(title)}</h1>
        ${subtitle ? `<p>${headline(subtitle)}</p>` : ""}
        ${
          facts.length
            ? `<div class="v-facts">${facts
                .map(
                  ([name, text]) =>
                    `<span>${icon(Lucide[name], 2.25)}${escape(text)}</span>`,
                )
                .join("")}</div>`
            : ""
        }
    </div>
</div>`;

/** The featured pair side by side, edge to edge, "or" on the seam. */
export const faceOff = (a, b) => `
<div class="v-faceoff">
    <div class="v-half" style="background-image:url('${a.banner}');background-position:${a.bannerPosition}"></div>
    <div class="v-half" style="background-image:url('${b.banner}');background-position:${b.bannerPosition}"></div>
    <span class="v-or mono">or</span>
</div>`;

/**
 * The last card, and the one moment a video asks anything of the viewer:
 * the games just played as a wall of covers behind, then the logo, the
 * question for the comments and where to rate them. Never words on black.
 */
export const outro = ({ title, body }, action, covers = []) => `
<div class="v-outro">
    <div class="v-outro-art"><div class="wall">${[
      ...covers,
      ...covers,
      ...covers,
      ...covers,
    ]
      .slice(0, 16)
      .map((cover) => `<img src="${cover}" alt="">`)
      .join("")}</div></div>
    <div class="v-outro-copy">
        <div class="v-outro-mark">${logo}</div>
        <h2>${headline(title)}</h2>
        ${body ? `<p>${headline(body)}</p>` : ""}
        ${signoff(action)}
    </div>
</div>`;

/** Fades the intro out and the outro in; every scene shares the bookends. */
export const BOOKENDS = `
const bookends = (t, end) => {
  const i = $(".v-intro");
  if (i) show(i, 1 - at(t, ${INTRO} - 0.35, 0.35), 0, 1);
  // The picture settles in over the first second, so the opening moves.
  const v = $(".v-visual");
  if (v) v.style.transform = "scale(" + (1.06 - 0.06 * out(at(t, 0, 1.1))) + ")";
  const o = $(".v-outro");
  if (o) show(o, out(at(t, end, 0.5)), 60, 0.98);
};
`;

/**
 * A video post as one page holding a single 1080x1920 stage. `script` must
 * set `window.scene = { duration, cover, frameAt(t) }`.
 */
export const videoPage = (kind, stage, script) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<link rel="stylesheet" href="slides.css">
</head>
<body class="video">
<section class="slide stage ${kind}" data-name="video">
    ${brand}
    ${stage}
</section>
<script>
${CLIENT}
${BOOKENDS}
${script}
window.fitted = document.fonts.ready;
</script>
</body>
</html>`;

export { escape };
