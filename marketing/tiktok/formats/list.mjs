import { escape } from "../slides.mjs";

/** One box per line, as TikTok's text tool draws it; `\n` breaks a line
 *  where the wrapping strands a word. */
const boxed = (text, extra = "") =>
  `<div class="boxed${extra}">${escape(text)
    .split("\n")
    .map((line) => `<span>${line}</span>`)
    .join("<br>")}</div>`;

const slide = (name, art, words) => `
<section class="slide" data-name="${name}">
    <div class="art bleed" style="background-image:url('${art.game.banner}');background-position:${art.game.bannerPosition}"></div>
    <div class="words">${words}</div>
</section>`;

/**
 * Tips or a top X, made to look like someone put it together in the app: a
 * picture each, the hook in TikTok's boxed text, then one item a slide, its
 * number and name boxed and a single line under it. No sign-up slide; the
 * description carries the address. `items` arrive #1 first, and a countdown
 * shows them from the bottom up so the top spot is the last swipe.
 */
export const renderList = (post) => {
  const numbered = post.items.map((item, i) => ({ ...item, n: i + 1 }));
  const shown = post.countdown ? [...numbered].reverse() : numbered;
  return page([
    slide("hook", post.hook.art, boxed(post.hook.text, " hook")),
    ...shown.map(({ n, title, line, art }) =>
      slide(
        `item-${String(n).padStart(2, "0")}`,
        art,
        boxed(`${n}. ${title ?? art.game.title}`) +
          (line
            ? `<p class="plain" data-max-lines="2">${escape(line)}</p>`
            : ""),
      ),
    ),
    ...(post.outro
      ? [slide("outro", post.outro.art, boxed(post.outro.text))]
      : []),
  ]);
};

const page = (slides) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<link rel="stylesheet" href="simple.css">
</head>
<body>
${slides.join("\n")}
</body>
</html>`;
