import { brand, button, escape, headline } from "../slides.mjs";

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

/** The opening card: the claim of the video, over whatever it's about. */
export const intro = ({ title, subtitle }) => `
<div class="v-intro">
    <h1>${headline(title)}</h1>
    ${subtitle ? `<p>${headline(subtitle)}</p>` : ""}
</div>`;

/** The last card: what to do now, and where. */
export const outro = ({ title, body }, action) => `
<div class="v-outro">
    <h2>${headline(title)}</h2>
    ${body ? `<p>${headline(body)}</p>` : ""}
    ${button(action)}
</div>`;

/** Fades the intro out and the outro in; every scene shares the bookends. */
export const BOOKENDS = `
const bookends = (t, end) => {
  const i = $(".v-intro");
  if (i) show(i, 1 - at(t, ${INTRO} - 0.35, 0.35), 0, 1);
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
