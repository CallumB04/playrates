/**
 * The handmade format. Its slides aren't generated: each post lays them out
 * by hand in posts/<post>/slides.html, with its pictures beside it in img/,
 * on the classes in handmade.css. This renders that page to the PNGs and
 * writes the same contact sheet and posting notes as every other format.
 */
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { postingNotes } from "./posting.mjs";

/** TikTok draws its tabs, caption and like/comment rail over these. */
const SAFE = { bottom: 1920 - 380, right: 1080 - 140 };

const textOf = (html) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");

/** Item copy the post file has and the page has lost, so the two can't
 *  drift apart: the post file is what the history reads. The hook is left
 *  out, as its game name is usually the game's logo on the slide. */
export const missingCopy = (post, html) => {
  const text = textOf(html);
  return post.items
    .flatMap((item) => [item.title, item.line])
    .filter(Boolean)
    .map((copy) => copy.replace(/\s+/g, " "))
    .filter((copy) => !text.includes(copy));
};

export const renderHandmade = async ({ post, name, here, outDir }) => {
  const page = path.join(here, "posts", name, "slides.html");
  const html = await readFile(page, "utf8").catch(() => {
    throw new Error(
      `a handmade post needs its slides in ${path.relative(process.cwd(), page)}`,
    );
  });
  for (const copy of missingCopy(post, html))
    console.warn(
      `warning: "${copy}" is in the post file but not on the slides`,
    );

  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  const tab = await browser.newPage({
    viewport: { width: 1080, height: 1920 },
  });
  await tab.goto(pathToFileURL(page).href);
  const broken = await tab.evaluate(async () => {
    await document.fonts.ready;
    // Background pictures aren't in document.images, and a screenshot taken
    // before they decode comes out with a black slide.
    const urls = [...document.querySelectorAll("*")]
      .map(
        (el) =>
          getComputedStyle(el).backgroundImage.match(/url\("(.+?)"\)/)?.[1],
      )
      .filter((url) => url && !url.startsWith("data:"));
    const images = [
      ...document.images,
      ...urls.map((src) => Object.assign(new Image(), { src })),
    ];
    const failed = await Promise.all(
      images.map((img) =>
        img.decode().then(
          () => null,
          () => img.src,
        ),
      ),
    );
    return failed.filter(Boolean);
  });
  if (broken.length)
    throw new Error(`pictures that didn't load: ${broken.join(", ")}`);

  const problems = await tab.evaluate(
    ({ bottom, right }) =>
      [...document.querySelectorAll(".slide")].flatMap((slide, i) => {
        const origin = slide.getBoundingClientRect();
        return [...slide.querySelectorAll(".band > *, .cap, .aside")].flatMap(
          (el) => {
            // The words, not the element: a centred line's box spans the band.
            const range = document.createRange();
            range.selectNodeContents(el);
            const box =
              el.tagName === "IMG"
                ? el.getBoundingClientRect()
                : range.getBoundingClientRect();
            const found = [];
            const label = `slide ${i + 1}: "${el.textContent.trim().slice(0, 30)}"`;
            if (box.bottom - origin.top > bottom)
              found.push(`${label} runs into the caption area`);
            if (box.right - origin.left > right)
              found.push(`${label} runs under the right-hand rail`);
            return found;
          },
        );
      }),
    SAFE,
  );
  for (const problem of problems) console.warn(`warning: ${problem}`);

  const slidesDir = path.join(outDir, "slides");
  await rm(slidesDir, { recursive: true, force: true });
  await mkdir(slidesDir, { recursive: true });
  const files = [];
  for (const [i, slide] of (await tab.locator(".slide").all()).entries()) {
    const file = `${String(i + 1).padStart(2, "0")}-${(await slide.getAttribute("data-name")) ?? "slide"}.png`;
    await slide.screenshot({ path: path.join(slidesDir, file) });
    files.push(file);
  }

  await tab.setViewportSize({ width: files.length * 376 + 8, height: 656 });
  await tab.setContent(
    `<body style="margin:0;padding:8px;background:#1b1b1f;display:flex;gap:16px">${files
      .map(
        (file) =>
          `<img src="${pathToFileURL(path.join(slidesDir, file)).href}" width="360" height="640">`,
      )
      .join("")}</body>`,
  );
  await tab.evaluate(() =>
    Promise.all([...document.images].map((img) => img.decode())),
  );
  await tab.screenshot({
    path: path.join(outDir, "contact-sheet.png"),
    fullPage: true,
  });
  await browser.close();

  await writeFile(
    path.join(outDir, "posting.md"),
    postingNotes(post, files.length),
  );
  await writeFile(
    path.join(outDir, "description.txt"),
    `${post.tiktok.description}\n`,
  );
  return files;
};
